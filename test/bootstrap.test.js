const Waterline = require('waterline')

global.Adapter = require('../lib/adapter')

const adapters = {
  'sails-disk': require('sails-disk'),
  'sails-rabbitmq': global.Adapter,
}

const connections = {
  rabbit: {
    adapter: 'sails-rabbitmq'
  },
  disk: {
    adapter: 'sails-disk'
  }
}

before((done) => {
  let waterline = new Waterline();

  waterline.loadCollection(Waterline.Collection.extend({
    identity: 'message',
    tableName: 'message',
    connection: [ 'rabbit', 'disk' ],
    attributes: {
      title: 'string',
      content: 'string',
      stream: {
        model: 'stream'
      }

    },
    routingKey (values) {
      return values.stream
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
      if (err) return done(err);

      global.models = ontology.collections
      done(err);
    }
  )
})

after((done) => {
  Adapter.teardown(done)
})
