#  <img src="http://cdn.tjw.io/images/sails-logo.png" height='43px' /> RabbitMQ Adapter

[![NPM version][npm-image]][npm-url]
[![Build status][ci-image]][ci-url]
[![Dependency Status][daviddm-image]][daviddm-url]

RabbitMQ Adapter for Sails and Waterline ([AMQP 0.9](https://www.rabbitmq.com/amqp-0-9-1-reference.html)).
Implements the Waterline [pubsub
interface](https://github.com/balderdashy/sails-docs/blob/master/contributing/adapter-specification.md#subscribable-interface).

<img src="http://i.imgur.com/3j5klOp.png" height='43px' />

## Install
```sh
$ npm install sails-rabbitmq --save
```

## Configure

```js
// config/connections.js

module.exports.connections = {
  rabbitCluster: {
    adapter: 'sails-rabbitmq',
    host: 'localhost',
    port: 5672,
    login: 'user123',
    password: 'pass123',
    connectionTimeout: 10000,    // timeout in ms

    ssl: {
      enabled: true,
      // ...
    },
    clientProperties: {
      defaultExchangeName: '',
      reconnect: true,
      // ...
      //
      // For additional options, see
      // https://github.com/postwait/node-amqp#connection-options-and-url
    }
  }
};

```

## Usage

### 1. Setup Exchanges

RabbitMQ [Exchanges](https://github.com/tjwebb/sails-amqp/wiki/AMQP:-Exchanges) define the rules for routing messages to queues. 

```js
// config/amqp.js

// sails.config.amqp object is keyed by connection (defined in config/connections.js)
module.exports.amqp = {
  rabbitCluster: {
    exchanges: {
      logExchange: {
        // for more exchange options, see   
        // https://github.com/postwait/node-amqp#connectionexchangename-options-opencallback
        type: 'direct',

        // configure models that will use this exchange
        models: {
          LogEntry: {
            // for more model (publish) options, see
            // https://github.com/postwait/node-amqp#exchangepublishroutingkey-message-options-callback
            
            // routingKey is composed of a list of model attributes which determine how the 
            // message will be routed
            routingKey: [ 'severity' ],
            
            // the 'persist' object specifies how the message will be persisted once created.
            // leave undefined if you do not want sails-rabbitmq to automatically persist objects
            // in a separate datastore
            persist: false
          }
        }
      },
      chatExchange: {
        type: 'topic',
        durable: true,
        models: {
          Message: {
            routingKey: [ 'streamType', 'streamId', 'parentMessage' ],
            persist: {
              connection: 'pgDatabase'
            }
          }
        }
      }
    }
  }
};
```

## License
MIT

[sails-logo]: http://cdn.tjw.io/images/sails-logo.png
[sails-url]: https://sailsjs.org
[npm-image]: https://img.shields.io/npm/v/sails-amqp.svg?style=flat-square
[npm-url]: https://npmjs.org/package/sails-amqp
[ci-image]: https://img.shields.io/circleci/project/cnect/sails-amqp/master.svg?style=flat-square
[ci-url]: https://circleci.com/gh/tjwebb/sails-amqp
[daviddm-image]: http://img.shields.io/david/tjwebb/sails-amqp.svg?style=flat-square
[daviddm-url]: https://david-dm.org/tjwebb/sails-amqp
