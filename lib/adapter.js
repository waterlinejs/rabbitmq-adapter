const rabbit = require('rabbit.js')
const _ = require('lodash')

/**
 * Implementation of the sails-rabbitmq Adapter
 */
const Adapter = {

  /**
   * Local connections store
   */
  connections: { },

  // TODO remove from this list .on('close'...)
  userSockets: [ ],

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
    if (Adapter.connections[connection.identity]) return cb(new Error('Connection is already registered.'))

    let context = rabbit.createContext(connection.url)

      /*(
    context.on('error', error => {
      throw new Error(error)
    })
    */

    let config = Adapter.connections[connection.identity] = {
      context: context,
      models: _.indexBy(collections, 'identity'),
      sockets: {
        publish: { },
        push: { }
      }
    }
    context.on('ready', () => {
      Promise
        .all(_.map(collections, model => {
          return Adapter
            .getPublishSocket(connection.identity, model.identity)
            .then(pubSocket => {
              config.sockets.publish[model.identity] = pubSocket

              return this.getPushSocket(connection.identity, model.identity)
            })
            .then(pushSocket => {
              config.sockets.push[model.identity] = pushSocket

              return Promise.resolve()
            })
        }))
        .then(() => {
          cb()
        })
        .catch(error => {
          cb(error)
        })
    })
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
      _.each(Adapter.connections, (connection) => {
        _.each(connection.sockets.publish, socket => { socket.close() })
        _.each(connection.sockets.push, socket => { socket.close() })
      })
      Adapter.connections = { }
      return cb()
    }

    if (!Adapter.connections[conn]) return cb()

    _.each(Adapter.connections[conn].sockets.publish, socket => { socket.close() })
    _.each(Adapter.connections[conn].sockets.push, socket => { socket.close() })

    _.each(Adapter.userSockets, socket => { socket.close() })
    Adapter.userSockets = [ ]

    delete Adapter.connections[conn]
    cb()
  },

  /**
   * Publish a message to an exchange. Accepts the same arguments as the 
   * update() method in the "semantic" interface.
   *
   * Exchange configuration defined in the adapter's connection config object
   * determines how the message is handled/routed by the exchange.
   */
  publish (connection, collection, values, cb) {
    let socket = Adapter._getSocket(connection, collection, 'publish')
    let routingKey = Adapter._getRoutingKey(connection, collection, values)
    socket.publish(routingKey, JSON.stringify(values), 'utf8')

    return Promise.resolve(socket)
  },

  getPublishSocket (connection, collection) {
    let config = Adapter.connections[connection]
    let context = config.context
    let address = Adapter.getExchangeName(collection)
    let socket = context.socket('PUBLISH', { routing: 'topic' })

    return new Promise((resolve, reject) => {
      socket.connect(address, () => {
        resolve(socket)
      })
    })
  },

  getSubscribeSocket (connection, collection, options = { }) {
    let config = Adapter.connections[connection]
    let context = config.context
    let address = Adapter.getExchangeName(collection)
    let routingKey = Adapter._getRoutingKey(connection, collection, options.where)
    let socket = context.socket('SUBSCRIBE', { routing: 'topic' })

    return new Promise((resolve, reject) => {
      socket.connect(address, routingKey, () => {
        Adapter.userSockets.push(socket);
        resolve(socket)
      })
    })
  },

  getPushSocket (connection, collection, options = { }) {
    let config = Adapter.connections[connection]
    let context = config.context
    let address = Adapter.getQueueName(collection, options.worker)
    let socket = context.socket('PUSH')

    return new Promise((resolve, reject) => {
      socket.connect(address, () => {
        resolve(socket)
      })
    })
  },

  getWorkerSocket (connection, collection, options = { }) {
    let config = Adapter.connections[connection]
    let context = config.context
    let address = Adapter.getQueueName(collection, options.worker)
    let socket = context.socket('WORKER')

    return new Promise((resolve, reject) => {
      socket.connect(address, () => {
        Adapter.userSockets.push(socket);
        resolve(socket)
      })
    })
  },

  _getSocket (connectionId, collection, type) {
    let connection = Adapter.connections[connectionId]
    return connection.sockets[type][collection]
  },

  getExchangeName (model) {
    return `sails.models.${model}`
  },

  getQueueName (model, worker) {
    return `sails.models.${model}.${worker}`
  },

  /**
   * Return AMQP routing key for a given Model instance
   * @return dot-delimited string of model attributes which constitutes the
   *    queue routing key
   */
  _getRoutingKey (connection, collection, values) {
    let config = Adapter.connections[connection]
    var Model = config.models[collection]
    if (_.isUndefined(values)) {
      return '#'
    }
    else if (!_.isFunction(Model.getRoutingKey)) {
      throw new Error(
        `The model ${Model.identity} must define getRoutingKey(values)
        in order to be used with the Waterline pubsub interface`
      )
    }
    else {
      return Model.getRoutingKey(values)
    }
  }
}

export default Adapter
