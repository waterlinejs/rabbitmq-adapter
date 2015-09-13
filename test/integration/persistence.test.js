const assert = require('assert')
const _ = require('lodash')
const rabbit = require('rabbit.js')
const Promise = require('bluebird')

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
    global.models.message.update({
        id: id
      }, {
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

  it('should create multiple messages, and pass the correct data to .then', done => {
      const messages = [{
        title: 'first',
        content: 'hi'
      }, {
        title: 'second',
        content: 'yo'
      }, {
        title: 'third',
        content: 'what'
      }]

      Promise.all(messages.map(msg => {
          return global.models.message.create(msg)
        }))
        .then(msgs => {
            assert(msgs.length == 3)
            msgs.forEach((msg, index) => {
                assert(msg.title == messages[index].title)
            })
            done()
        })
        .catch(done)
  })
})
