const rabbit = require('rabbit.js')
const _ = require('lodash')

export default class Persister {

  constructor (sailsApp) {
    this.sails = sailsApp
    this.sockets = { }
  }

  /**
   * Bind all relevant models to persistence handlers
   */
  initialize (next) {

    Promise.all(
      _.map(this.getPersistentModels(), Model => {
        return Model.socket({ type: 'worker', worker: 'persistence' }).then(socket => {
          this.bindPersistenceHandler(socket, Model)
        })
      }))
      .then(() => {
        next()
      })
      .catch(next)
  }

  /**
   * Release all sockets
   */
  teardown (next) {
    _.each(this.sockets, socket => {
      socket.close()
    })
    this.sockets = { }
  }

  bindPersistenceHandler (socket, Model) {
    this.sockets[model.identity] = socket

    socket.on('data', (data) => {
      let values = JSON.parse(data)
      let pk = values[Model.primaryKey]

      if (pk) {
        Model.update(values)
          .then(model => {
          })
      }
      else {
        Model.create(values)
          .then(model => {
          
          })
      }
    })
  }

  /**
   * Get all sails connections that use the sails-rabbitmq adapter
   */
  getRabbitConnections () {
    let rabbitConnections = _.pick(this.sails.config.connections, connection => {
      return connection.adapter == 'sails-rabbitmq'
    })

    return _.keys(rabbitConnections)
  }

  /**
   * Find all sails models that meet the following conditions:
   * 1. use the sails-rabbitmq adapter in its connection
   * 2. contain a persistence connection
   * 3. implement the socket() function (via the adapter)
   */
  getPersistentModels () {
    let rabbitConnections = this.getRabbitConnections()

    return _.pick(this.sails.models, model => {
      return _.all([
        model.connection.length > 1,
        _.intersection(model.connection, rabbitConnections).length,
        _.isFunction(model.socket)
      ])
    })
  }

}
