const Waterline = require('waterline')
const util = require('util')

global.Adapter = require('../lib/adapter')

const adapters = {
  'sails-memory': require('sails-memory'),
  'sails-rabbitmq': global.Adapter,
}

const connections = {
  rabbit: {
    adapter: 'sails-rabbitmq',
    persistence: true
  },
  persistence: {
    adapter: 'sails-memory'
  }
}

before((done) => {
  let waterline = new Waterline();

  waterline.loadCollection(Waterline.Collection.extend({
    identity: 'message',
    autoPK: true,
    tableName: 'message',
    connection: [ 'rabbit', 'persistence' ],
    routingKey: [ 'stream' ],
    attributes: {
      title: 'string',
      content: 'string',
      stream: {
        model: 'stream'
      }
    }
  }))
  waterline.loadCollection(Waterline.Collection.extend({
    identity: 'stream',
    autoPK: true,
    tableName: 'stream',
    connection: [ 'persistence' ],
    attributes: {
      name: 'string',
      messages: {
        collection: 'message',
        via: 'stream'
      }
    }
  }))

  waterline.initialize({
      adapters: adapters,
      connections: connections
    },
    function (err, ontology) {
      if (err) {
        console.trace(err)
        return done(new Error(err))
      }

      global.models = ontology.collections
      done(err);
    }
  )
})

after((done) => {
  Adapter.teardown(done)
})
