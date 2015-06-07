const Waterline = require('waterline')
const util = require('util')

global.Adapter = require('../lib/adapter')

const adapters = {
  'sails-memory': require('sails-disk'),
  'sails-rabbitmq': global.Adapter,
}

const connections = {
  rabbit: {
    adapter: 'sails-rabbitmq',
    persistence: true
  },
  disk: {
    adapter: 'sails-memory'
  }
}

before((done) => {
  let waterline = new Waterline();

  waterline.loadCollection(Waterline.Collection.extend({
    identity: 'message',
    tableName: 'message',
    connection: [ 'rabbit', 'disk' ],
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
    tableName: 'stream',
    connection: [ 'disk' ],
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
