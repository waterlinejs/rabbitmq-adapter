const rabbit = require('rabbit.js')
const _ = require('lodash')
const workers = require('./workers')

/**
 * @class Adapter
 *
 * Implementation of the sails-rabbitmq Adapter
 */
export class Adapter {

  /**
   * Initialize adapter defaults
   */
  constructor (options) {
    this.connections = { }
    this.defaults = _.extend({
      url: 'amqp://localhost',
      schema: false
    }, options)
  }

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
    if (connections[connection.identity]) return cb(new Error('Connection is already registered.'))

    let context = rabbit.createContext(connection.url)

    context.on('error', error => {
      throw new Error(error)
    })

    context.on('ready', () => {
      Promise
        .map(collections, model => {
          return new Promise((resolve, reject) => {
            let socket = context.socket('PUBLISH', { routing: 'topic' })

            socket.setEncoding('utf8')
            socket.connect(model.identity, () => {
              resolve({
                identity: model.identity,
                socket: socket
              })
            })
          })
        })
        .then(sockets => {
          this.connections[connection.identity] = {
            context: context,
            sockets: _.indexBy(sockets, 'identity')
          }
          cb()
        })
        .catch(error => {
          cb(error)
        })
    })
  }

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
      _.each(this.connections, (connection) => {
        connection.close()
      })
      this.connections = { }
      return cb()
    }

    if (!this.connections[conn]) return cb()

    this.connections[conn].close()
    delete this.connections[conn]
    cb()
  }

  /**
   * Publish a message to an exchange. Accepts the same arguments as the 
   * update() method in the "semantic" interface.
   *
   * Exchange configuration defined in the adapter's connection config object
   * determines how the message is handled/routed by the exchange.
   */
  publish (config, collection, values, cb) {
    let socket = this.getSocket(config, collection)
    socket.setEncoding('utf8')
    socket.publish(this.getRoutingKey(collection, values), JSON.stringify(values))

    cb()
  }

  /**
   * Subscribe to a subset of messages, filtered by an optional "where" clause.
   */
  subscribeWhere (config, collection, options, cb) {
    if (!global.sails || !sails.models) {
      throw new Error('subscribeWhere() is only supported when used in a sails.js environment');
    }

    let socket = context.socket('SUBSCRIBE', { routing: 'topic' })
    let routingKey = this.getRoutingKey(collection, options.where)
    let Model = sails.models[collection.identity]

    socket.setEncoding('utf8')
    socket.on('data', (data) => {
      let criteria = JSON.parse(data)
      Model.findOne(criteria).exec(cb)
    })
    socket.connect(this.getQueueName(collection), routingKey, () => { })

    return socket;
  }

  getSocket (config, collection) {
    let connection = this.connections[config.identity]
    return connection.sockets[collection.identity]
  }

  getQueueName (collection) {
    return collection.identity
  }

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
