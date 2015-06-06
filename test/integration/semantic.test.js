const assert = require('assert')

describe('semantic', () => {

  it('should register models in the waterline ontology', () => {
    assert(models.message);
    assert(models.stream);
  })

  it('should create a model in the typical manner', (done) => {
    models.message.create({
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
