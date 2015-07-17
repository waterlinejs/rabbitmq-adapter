const rabbit = require('rabbit.js')
const _ = require('lodash')

export default class PersistenceHandler {

  constructor (connection, model) {
    this.connection = connection
    this.model = model

    if (!this.isPersistentModel()) {
      throw new Error(`model ${this.model.identity} does not support persistence`)
    }

    return this.model.getWorkerSocket({ name: 'persistence' })
      .then(socket => {
        this.socket = socket
        return this.bindPersistenceHandler()
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
      let pk = values[this.model.primaryKey]

      if (pk) {
        persistenceConnection.update(connectionId, this.model.identity, {where:{id: pk}}, values, (err, model) => {
          this.model.publish(model)
          this.socket.ack()
        })
      }
      else {
        persistenceConnection.create(connectionId, this.model.identity, values, (err, model) => {
          this.model.publish(model)
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
