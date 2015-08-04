const rabbit = require('rabbit.js')
const _ = require('lodash')
const Cast = require('waterline/lib/waterline/core/typecast');

export default class PersistenceHandler {

  /**
   * Setup the persistence handler.
   *
   * note: this adapter should be able to function in the absence of
   * sails. However, we need to wait for the persistence adapter to load before
   * trying to persist payloads from the messaging queue. We check for the
   * existence of global.sails, and if it exists, wait for the orm hook to 
   * finish loading.
   *
   * corollary: in some ways, this trades one potential race condition for
   * another. The app might try to send messages to queues that aren't yet bound
   * to a persistence handler. This is an inconvenience, but not a dealbreaker.
   * Sending a message to a queue and having it stuck there is much better than
   * pulling a message off the queue and not be able to persist it anywhere.
   */
  constructor (connection, model) {
    this.connection = connection
    this.model = model

    if (!this.isPersistentModel()) {
      throw new Error(`model ${this.model.identity} does not support persistence`)
    }

    return this.model.getWorkerSocket({ name: 'persistence' })
      .then(socket => {
        this.socket = socket

        if (!global.sails) {
          console.log('sails-rabbitmq: binding persistence handlers immediately...')
          return this.bindPersistenceHandler()
        }

        console.log('sails-rabbitmq: waiting for orm hook to load before binding persistence handlers...')
        global.sails.after('hook:orm:loaded', () => { this.bindPersistenceHandler() })
      })
      .catch(err => {
        console.error(err)
      })
  }

  /**
   * Release all sockets
   */
  teardown () {
    return new Promise((resolve, reject) => {
      this.socket.once('close', () => {
        resolve()
      })
      this.socket.close()
    })
  }

  bindPersistenceHandler () {
    let connectionId = this.model.getPersistenceConnection()
    let persistenceConnection = this.model.connections[connectionId]._adapter

    this.socket.on('data', (data) => {
      let values = JSON.parse(data)
      let typecast = new Cast();
      typecast.initialize(this.model.attributes);
      values = typecast.run(values);
      let pk = values[this.model.primaryKey]

      if (pk) {
        persistenceConnection.update(connectionId, this.model.identity, {where:{id: pk}}, values, (err, model) => {
          if (!err) {
            this.model.publish(model)
          }
          this.socket.ack()
        })
      }
      else {
        persistenceConnection.create(connectionId, this.model.identity, values, (err, model) => {
          if (!err) {
            this.model.publish(model)
          }
          this.socket.ack()
        })
      }
    })
  }

  /**
   * Return true if the specified model supports persistence; false otherwise
   */
  isPersistentModel () {
    let connectionCount = this.model.connection.length

    if (connectionCount > 2) {
      console.error(`Persistent connection is ambiguous for model ${this.model.identity}`)
    }

    return connectionCount === 2
  }

}
