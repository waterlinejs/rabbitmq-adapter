const assert = require('assert')
const _ = require('lodash')
const rabbit = require('rabbit.js')

describe('pubsub', () => {

  describe('internal connections store', () => {
    it('should contain connections object', () => {
      assert(_.isObject(Adapter.connections))
    })
  })

  describe('#getRoutingKey', () => {
    it('should generate correct routingKey for model', () => {
      let message = {
        title: 'hello',
        stream: 'stream1'
      }
      let routingKey = global.Adapter.getRoutingKey('rabbit', 'message', message)

      assert.equal(routingKey, 'stream1')
    })
  })

  describe('#publish', () => {
    it('should subscribe to Message without error', (done) => {
      global.models.message.getSubscribeSocket().then(socket => {
        done()
      })
    })
    it('should receive published Message', (done) => {
      models.message.getSubscribeSocket({ where: { stream: 'mystream' } }).then(socket => {
        socket.on('data', data => {
          assert(data)
          socket.close()
          done()
        })
        models.message.publish({
            title: 'publish test',
            content: 'hello world',
            stream: 'mystream'
          })
          .then(socket => {
            assert(socket)
          })
      })
    })
    it('should not receive published Message with where clause mismatch', done => {
      setTimeout(() => {
        done()
      }, 400)

      models.message.getSubscribeSocket({ where: { stream: 'otherstream' } })
        .then(socket => {
          socket.on('data', data => {
            assert(data)
            socket.close()
            done('should not have received a message')
          })
          return models.message.publish({
            title: 'publish test',
            content: 'hello world',
            stream: 'mystream'
          })
        })
        .then(assert)
        .catch(done)
    })
  })
})
