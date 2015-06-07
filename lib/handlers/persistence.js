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
  teardown (next) {
    this.socket.close()
  }

  bindPersistenceHandler () {
    this.socket.on('data', (data) => {
      let values = JSON.parse(data)
      let pk = values[this.model.primaryKey]

      if (pk) {
        this.model.update(values)
          .then(model => {
            console.log('updated', model)
            this.socket.ack()
          })
      }
      else {
        this.model.create(values)
          .then(model => {
            console.log('created', model)
            this.socket.ack()
          })
      }
    })
  }

  /**
   * Return true if the specified model supports persistence; false otherwise
   */
  isPersistentModel () {
    return this.model.connection.length > 1
  }

}
