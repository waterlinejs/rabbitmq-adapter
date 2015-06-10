const assert = require('assert')
const _ = require('lodash')
const rabbit = require('rabbit.js')

describe('persistence', () => {

  let id = null
  it('should create message via persistence worker', done => {
    global.models.message.create({
        title: 'created?',
        content: 'yes'
      })
      .then(message => {
        assert(message.id)
        id = message.id
        done()
      })
      .catch(done)
  })

  it('should update message via persistence worker', done => {
    global.models.message.update({ id: id }, {
        id: id,
        title: 'updated?',
        content: 'yes'
      })
      .then(messages => {
        let message = messages[0]
        assert.equal(message.title, 'updated?')
        assert.equal(message.id, id)
        done()
      })
      .catch(done)
  })
})
