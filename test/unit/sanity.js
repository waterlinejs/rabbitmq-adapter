const assert = require('assert')
const _ = require('lodash')
const Adapter = require('../../')

describe('sanity', function () {
  it('should exist', function () {
    assert(_.isObject(Adapter));
  })
  it('should export a publish method', function () {
    assert(_.isFunction(Adapter.publish));
  })

})
