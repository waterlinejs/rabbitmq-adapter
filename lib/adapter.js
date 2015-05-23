var amqp = require('amqplib');
var _ = require('lodash');

var connections = { };

var Adapter = {

  syncable: false,

  // Default configuration for connections
  defaults: {
    // http://www.rabbitmq.com/uri-spec.html
    url: 'amqp://localhost',
    socketOptions: {

    },
    exchanges: {
      'default': {
        type: 'direct',
        queues: {
          // XXX TODO 
        }
      }
    },
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
  registerConnection: function(config, collections, cb) {
    if (!config.identity) return cb(new Error('Connection is missing an identity.'));
    if (connections[config.identity]) return cb(new Error('Connection is already registered.'));

    // Add in logic here to initialize connection
    // e.g. connections[connection.identity] = new Database(connection, collections);
    amqp
      .connect(config.url, config.socketOptions)
      .then(function (connection) {
        connections[config.identity] = connection;

        cb();
      })
      .then(null, cb);
  },


  /**
   * Fired when a model is unregistered, typically when the server
   * is killed. Useful for tearing-down remaining open connections,
   * etc.
   *
   * @param  {Function} cb [description]
   * @return {[type]}      [description]
   */
  teardown: function (conn, cb) {
    if (typeof conn == 'function') {
      cb = conn;
      conn = null;
    }
    if (!conn) {
      _.each(connections, function (connection) {
        connection.close();
      });
      connections = { };
      return cb();
    }

    if(!connections[conn]) return cb();

    connections[conn].close();
    delete connections[conn];
    cb();
  },

  /**
   * Publish an message to an exchange. Accepts the same parameters as the 
   * create() method in the "semantic" interface.
   *
   * Exchange configuration defined in the adapter's connection config object
   * determines how the message is handled/routed by the exchange.
   *
   */
  publish: function (connection, collection, values, cb) {

  },

  /**
   * Subscribe to a subset of messages, filtered by an optional "where" clause.
   */
  subscribe: function (connection, collection, options, cb) {

  }
};

module.exports = Adapter;
