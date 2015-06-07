const rabbit = require('rabbit.js')
const _ = require('lodash')

import PersistenceHandler from './handlers/persistence'

/**
 * Implementation of the sails-rabbitmq Adapter
 */
const Adapter = {

  /**
   * Local connections store
   */
  connections: new Map(),

  /**
   * Adapter default configuration
   */
  defaults: {
    url: 'amqp://localhost',
    schema: false
  },

  /**
   * This method runs when a model is initially registered
   * at server-start-time.  This is the only required method.
   *
   * @param  {[type]}   connection [description]
   * @param  {[type]}   collection [description]
   * @param  {Function} cb         [description]
   * @return {[type]}              [description]
   */
  registerConnection (connection, collections, cb) {
    if (!connection.identity) return cb(new Error('Connection is missing an identity.'))
    if (this.connections.get(connection.identity)) return cb(new Error('Connection is already registered.'))

    let context = rabbit.createContext(connection.url)

    let config = {
      context: context,
      models: new Map(_.pairs(collections)),
      userSockets: new Set(),
      sockets: {
        publish: new Map(),
        push: new Map()
      },
      persistence: connection.persistence
    }
    this.connections.set(connection.identity, config)

    context.on('error', (err) => {
      console.error(err)
    })

    context.on('ready', () => {
      this.setupConnection(connection, collections, config)
        .then(() => {
          cb()
        })
        .catch(cb)
    })
  },

  setupPersistenceHandler (connection, model, config) {
    new PersistenceHandler(connection, model)
  },

  setupConnection (connection, collections, config) {
    return Promise
      .all(_.map(collections, model => {
        return this.setupConnectionSockets(connection, model, config)
      }))
      .then(() => {
        if (!config.persistence) {
          return Promise.resolve()
        }
        return Promise.all(_.map(collections, model => {
          return this.setupPersistenceHandler(connection, model, config)
        }))
      })
  },

  setupConnectionSockets (connection, model, config) {
    return Promise.all([

      this.getPublishSocket(connection.identity, model.identity)
        .then(pubSocket => {
          config.sockets.publish.set(model.identity, pubSocket)
        }),

      this.getPushSocket(connection.identity, model.identity, { name: 'persistence' })
        .then(pushSocket => {
          config.sockets.push.set(model.identity, pushSocket)
        })
    ])
  },

  /**
   * Fired when a model is unregistered, typically when the server
   * is killed. Useful for tearing-down remaining open connections,
   * etc.
   *
   * @param  {Function} cb [description]
   * @return {[type]}      [description]
   */
  teardown (conn, cb) {
    if (_.isFunction(conn)) {
      cb = conn
      conn = null
    }
    if (!conn) {
      for (let connection of this.connections.values()) {
        for (let socket of connection.sockets.publish.values()) socket.close()
        for (let socket of connection.sockets.push.values())    socket.close()
        for (let socket of connection.userSockets.values())     socket.close()
      }
      this.connections.clear()
      return cb()
    }
    else {
      if (!this.connections.get(conn)) return cb()

      let connection = this.connections.get(conn)

      for (let socket of connection.sockets.publish.values()) socket.close()
      for (let socket of connection.sockets.push.values())    socket.close()
      for (let socket of connection.userSockets.values())     socket.close()

      this.connections.delete(conn)

      return cb()
    }
  },

  /**
   * Publish a message to an exchange. Accepts the same arguments as the 
   * update() method in the "semantic" interface.
   *
   * Exchange configuration defined in the adapter's connection config object
   * determines how the message is handled/routed by the exchange.
   */
  publish (connection, collection, values, cb) {
    let socket = this.getSocket(connection, collection, 'publish')
    let routingKey = this.getRoutingKey(connection, collection, values)
    socket.publish(routingKey, JSON.stringify(values), 'utf8')

    return Promise.resolve(socket)
  },

  /**
   * Setup and connect a PUBLISH socket for the specified model
   */
  getPublishSocket (connection, collection) {
    let config = this.connections.get(connection)
    let context = config.context
    let address = this.getExchangeName(collection)
    let socket = context.socket('PUBLISH', { routing: 'topic' })

    return new Promise((resolve, reject) => {
      socket.connect(address, () => {
        resolve(socket)
      })
    })
  },

  /**
   * Setup and connect a SUBSCRIBE socket for the specified model
   */
  getSubscribeSocket (connection, collection, options = { }) {
    let config = this.connections.get(connection)
    let context = config.context
    let address = this.getExchangeName(collection)
    let routingKey = this.getRoutingKey(connection, collection, options.where)
    let socket = context.socket('SUBSCRIBE', { routing: 'topic' })

    socket.setEncoding('utf8')
    socket.on('close', () => {
      config.userSockets.delete(socket)
    })

    return new Promise((resolve, reject) => {
      socket.connect(address, routingKey, () => {
        config.userSockets.add(socket);
        resolve(socket)
      })
    })
  },

  /**
   * Setup and connect a PUSH socket for the specified model
   */
  getPushSocket (connection, collection, options = { }) {
    let config = this.connections.get(connection)
    let context = config.context
    let address = this.getQueueName(collection, options.name)
    let socket = context.socket('PUSH')

    return new Promise((resolve, reject) => {
      socket.connect(address, () => {
        resolve(socket)
      })
    })
  },

  /**
   * Setup and connect a WORKER socket for the specified model
   */
  getWorkerSocket (connection, collection, options = { }) {
    let config = this.connections.get(connection)
    let context = config.context
    let address = this.getQueueName(collection, options.name)
    let socket = context.socket('WORKER')

    socket.setEncoding('utf8')
    socket.on('close', () => {
      config.userSockets.delete(socket)
    })
    return new Promise((resolve, reject) => {
      socket.connect(address, () => {
        config.userSockets.add(socket);
        resolve(socket)
      })
    })
  },

  /**
   * Return an extant socket of the specific type for the specified model
   */
  getSocket (connectionId, collection, type) {
    let connection = this.connections.get(connectionId)
    return connection.sockets[type].get(collection)
  },

  /**
   * Return the name of the AMQP exchange that is used by the specified model
   */
  getExchangeName (model) {
    return `sails.models.${model}`
  },

  /**
   * Return the name of the AMQP queue that is used by the specified model
   * in conjuction with a particular type of work(er)
   */
  getQueueName (model, name) {
    if (_.isUndefined(name)) {
      throw new Error('name cannot be undefined in getQueueName')
    }
    return `sails.models.${model}.${name}`
  },

  /**
   * Return AMQP routing key for a given Model instance
   * @return dot-delimited string of model attributes which constitutes the
   *    queue routing key
   */
  getRoutingKey (connection, collection, values) {
    let config = this.connections.get(connection)
    var Model = config.models.get(collection)
    if (_.isUndefined(values)) {
      return '#'
    }
    else if (!_.isArray(Model.routingKey)) {
      throw new Error(
        `The model ${Model.identity} must define a routingKey
        in order to be used with the Waterline pubsub interface`
      )
    }
    else {
      return this.parseRoutingKey(Model.routingKey, values)
    }
  },

  /**
   * @return a rabbitmq routing key derived from a list of model attributes
   */
  parseRoutingKey (routingKey, values) {
    return routingKey.map(attribute => { return values[attribute] }).join('.')
  }
}

_.bindAll(Adapter)

export default Adapter
