#  <img src="http://cdn.tjw.io/images/sails-logo.png" height='43px' /> RabbitMQ Adapter

## NOTE: This adapter is under development and is not complete.

[![NPM version][npm-image]][npm-url]
[![Build status][ci-image]][ci-url]
[![Dependency Status][daviddm-image]][daviddm-url]

RabbitMQ Adapter for Sails and Waterline ([AMQP 0.9](https://www.rabbitmq.com/amqp-0-9-1-reference.html)).
Implements the Waterline [pubsub
interface](https://github.com/balderdashy/sails-docs/blob/master/contributing/adapter-specification.md#subscribable-interface).
The RabbitMQ Adapter does not support persistence on its own, and should always
be used with another adapter, such as
[sails-mongo](https://github.com/balderdashy/sails-mongo) or
[sails-postgres](https://github.com/balderdashy/sails-postgresql).

<img src="http://i.imgur.com/3j5klOp.png" height='43px' />

## Install
```sh
$ npm install sails-rabbitmq --save
```

## Configure

### 1. Setup Connection

```js
// config/connections.js
module.exports.connections = {
  regularPostgres: {
    // ...
  },
  rabbitCluster: {
    adapter: 'sails-rabbitmq',

    /**
     * The url of your rabbitmq installation
     */
    url: 'amqp://localhost:5672'
  }
};

```

### 2. Setup Models

For Models that you'd like to be able to publish and subscribe to, add the
connection to the Model:

```js
// api/models/Message
module.exports = {
  connections: [ 'rabbitCluster', 'regularPostgres' ],
  attributes: {
    title: 'string',
    body: 'string'
    // ...
  }
}
```

## Usage

### Publish

Objects can be published to RabbitMQ by using the standard `create` method, and
`/create` blueprint routes. The built-in persistence worker will persist the
object using the specified connection (in this case, the `regularPostgres`
connection).

### Subscribe

You can subscribe to Model "rooms" per usual. The pubsub messages will be routed
through RabbitMQ.

```js
// api/controllers/MessageController.js
module.exports = {
  watch: function (req, res) {
    if (req.isSocket) {
      Message.watch(req.socket);
    }
  },
  // ... etc
};

```

## License
MIT

[sails-logo]: http://cdn.tjw.io/images/sails-logo.png
[sails-url]: https://sailsjs.org
[npm-image]: https://img.shields.io/npm/v/sails-rabbitmq.svg?style=flat-square
[npm-url]: https://npmjs.org/package/sails-rabbitmq
[ci-image]: https://img.shields.io/circleci/project/tjwebb/sails-rabbitmq/master.svg?style=flat-square
[ci-url]: https://circleci.com/gh/tjwebb/sails-rabbitmq
[daviddm-image]: http://img.shields.io/david/tjwebb/sails-rabbitmq.svg?style=flat-square
[daviddm-url]: https://david-dm.org/tjwebb/sails-rabbitmq
