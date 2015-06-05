const assert = require('assert')

describe('semantic', function () {

  it('should register models in the waterline ontology', function () {
    assert(sails.models.message);
    assert(sails.models.stream);
  })

  it('should create a model in the typical manner', function (done) {
    sails.models.message.create({
        title: 'hello',
        content: 'world'
      })
      .then(function (message) {
        assert.equal(message.title, 'hello')
        done()
      })
      .catch(done)

  })

})
