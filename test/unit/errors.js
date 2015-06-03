const assert = require('assert')
const _ = require('lodash')
const Adapter = require('../../')

describe('error handling', function () {

  describe('#subscribeWhere', function () {
    it('should throw error when invoked outside of a sails.js app environment', function () {
      assert.throws(Adapter.subscribeWhere, Error)
    })
  })
})
