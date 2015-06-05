const assert = require('assert')
const _ = require('lodash')
const rabbit = require('rabbit.js')

describe('pubsub', function () {

  describe('internal connections store', function () {
    it('should contain connections object', function () {
      assert(_.isObject(Adapter.connections));
    })
  })

  describe('#publish', function () {
    it('should subscribe to Message without error', function () {
      sails.models.message.getSubscribeSocket().then(socket => {
        done()
      })
    })
    it('should receive published Message', function (done) {
      sails.models.message.getSubscribeSocket({ where: { stream: 'mystream' } }).then(socket => {
        socket.on('data', data => {
          assert(data)
          socket.close()
          done()
        })
        sails.models.message.publish({
            title: 'publish test',
            content: 'hello world',
            stream: 'mystream'
          })
          .then(socket => {
            assert(socket)
          })
      })
    })
    it('should not receive published Message with where clause mismatch', function (done) {
      setTimeout(() => {
        done()
      }, 1500)

      sails.models.message.getSubscribeSocket({ where: { stream: 'otherstream' } }).then(socket => {
        socket.on('data', data => {
          assert(data)
          socket.close()
          done('should not have received a message')
        })
        sails.models.message.publish({
            title: 'publish test',
            content: 'hello world',
            stream: 'mystream'
          })
          .then(socket => {
            assert(socket)
          })
      })
    })
  })
})
