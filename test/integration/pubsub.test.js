const assert = require('assert')
const _ = require('lodash')

describe('pubsub', function () {
  describe('#registerConnection', function () {

  })

  describe('internal connections store', function () {
    it('should contain connections object', function () {
      assert(_.isObject(Adapter.connections));
    })
  })

})
