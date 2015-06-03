const rabbit = require('rabbit.js')
const _ = require('lodash')
const workers = require('./workers')

/**
 * Implementation of the sails-rabbitmq Adapter
 */
const Adapter = {

  /**
   * Local connections store
   */
  connections: { },

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

    context.on('error', error => {
      throw new Error(error)
    })

    context.on('ready', () => {
      Promise
        .all(_.map(collections, model => {
          return new Promise((resolve, reject) => {
            let socket = context.socket('PUBLISH', { routing: 'topic' })

            socket.connect(Adapter.getExchangeName(model), () => {
              resolve({
                identity: model.identity,
                socket: socket
              })
            })
          })
        }))
        .then(sockets => {
          Adapter.connections[connection.identity] = {
            context: context,
            sockets: _.indexBy(sockets, 'identity')
          }
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
        connection.socket.close()
      })
      Adapter.connections = { }
      return cb()
    }

    if (!Adapter.connections[conn]) return cb()

    Adapter.connections[conn].socket.close()
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
  publish (config, collection, values, cb) {
    let socket = Adapter.getSocket(config, collection)
    socket.setEncoding('utf8')
    socket.publish(Adapter.getRoutingKey(collection, values), JSON.stringify(values))

    cb()
  },

  /**
   * Subscribe to a subset of messages, filtered by an optional "where" clause.
   */
  subscribeWhere (config, collection, options, cb) {
    if (!global.sails || !sails.models) {
      throw new Error('subscribeWhere() is only supported when used in a sails.js environment');
    }

    let socket = context.socket('SUBSCRIBE', { routing: 'topic' })
    let routingKey = Adapter.getRoutingKey(collection, options.where)
    let Model = sails.models[collection.identity]

    socket.setEncoding('utf8')
    socket.on('data', (data) => {
      let criteria = JSON.parse(data)
      Model.findOne(criteria).exec(cb)
    })
    socket.connect(Adapter.getExchangeName(collection), routingKey, () => { })

    return socket;
  },

  getSocket (config, collection) {
    let connection = Adapter.connections[config.identity]
    return connection.sockets[collection.identity]
  },

  getExchangeName (collection) {
    return `sails.models.${collection.identity}`
  },

  /**
   * Return AMQP routing key for a given Model instance
   * @return dot-delimited string of model attributes which constitutes the
   *    queue routing key
   */
  getRoutingKey (collection, values) {
    if (!_.isFunction(collection.getRoutingKey)) {
      throw new Error(
        `The model ${collection.identity} must define getRoutingKey(values)
        in order to be used with the Waterline pubsub interface`
      )
    }

    return collection.getRoutingKey(values)
  }
}

export default Adapter
