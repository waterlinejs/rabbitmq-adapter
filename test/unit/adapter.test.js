const assert = require('assert')
const _ = require('lodash')

describe('@Adapter', () => {
  describe('#getPersistenceConnection', () => {
    it('should return the non-rabbitmq connection', () => {
      let connection = global.models.message.getPersistenceConnection()

      assert.equal(connection, 'persistence')
    })
  })
})
