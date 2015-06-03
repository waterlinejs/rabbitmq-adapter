const assert = require('assert')

describe('semantic', function () {

  it('should register models in the waterline ontology', function () {
    assert(global.models.message);
    assert(global.models.stream);
  })

  it('should create a model in the typical manner', function (done) {
    global.models.message.create({
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
