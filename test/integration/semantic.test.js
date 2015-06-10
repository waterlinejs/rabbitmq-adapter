const assert = require('assert')

describe('semantic', () => {

  it('should register models in the waterline ontology', () => {
    assert(models.message)
    assert(models.stream)
  })
})
