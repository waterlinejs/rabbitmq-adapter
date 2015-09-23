# Waterline PostgreSQL Adapter

[![NPM version][npm-image]][npm-url]
[![Build status][ci-image]][ci-url]
[![Dependency Status][daviddm-image]][daviddm-url]
[![Code Climate][codeclimate-image]][codeclimate-url]

RabbitMQ Adapter for Sails and Waterline ([AMQP 0.9](https://www.rabbitmq.com/amqp-0-9-1-reference.html)).
Implements the Waterline [pubsub
interface](https://github.com/balderdashy/sails-docs/blob/master/contributing/adapter-specification.md#subscribable-interface).
The RabbitMQ Adapter does not support persistence on its own, and should always
be used with another adapter, such as
[sails-mongo](https://github.com/balderdashy/sails-mongo) or
[sails-postgresql](https://github.com/balderdashy/sails-postgresql). This module is
maintained in collaboration with [Michigan Community College Association](https://www.micollegesonline.org/).

## Install
```sh
$ npm install waterline-rabbitmq --save
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
    adapter: 'waterline-rabbitmq',

    /**
     * The url of your rabbitmq installation
     */
    url: 'amqp://localhost:5672',

    /**
     * Define how persistence is managed. 'true' will subscribe to all queues
     * and persist models that are published as messages. 'false' will do
     * nothing. This lets you turn off the persistence worker feature on the
     * Sails.js web server, and enable it in separate worker processes.
     */
    persistence: true
  }
};
```

### 2. Setup Models

For Models that you'd like to be able to publish and subscribe to, add the
`waterline-rabbitmq` connection to the relevant Models, and define a `routingKey`.

```js
// api/models/Message
module.exports = {
  connection: [ 'rabbitCluster', 'regularPostgres' ],
  routingKey: [ 'stream', 'parentMessage' ],
  attributes: {
    title: 'string',
    body: 'string',
    stream: {
      model: 'stream'
    },
    parentMessage: {
      model: 'message'
    }
    // ...
  }
};
```

#### `routingKey`

The `routingKey` determines how messages are routed to RabbitMQ queues. Consider
an example `Message` object from above:

```js
{
  title: 'yo dawg',
  body: 'I heard you like messages',
  stream: 'random',
  parentMessage: 1234
}
```

The `[ 'stream', 'parentMessage' ]` `routingKey` would generate a RabbitMQ
Routing Key with the value `random.1234`.


### 3. Set Primary Key Format

The primary key datatype for the persistence store defaults to `'integer'`.
You may need to change this, for example mongodb uses strings for their primary key.
This is optional depending upon your persistence store.

```js
// config/rabbitmq.js
module.exports.rabbitmq = {
    pkFormat: 'string'
};
```

## Usage

### `.create(values, callback)`
### `.update(criteria, values, callback)`

The `.create()` and `.update()` methods can be called per usual on
RabbitMQ-enabled models. RabbitMQ dispatches a message to an available
Persistence Worker, wherein the object is created or updated by the
persistence connection (e.g. `regularPostgres` above), and returned to the
provided callback (or Promise).

## Low-level API

"Low-level" is a nice way of saying "only use these methods if you know what you're
doing".

### `Model.getSubscribeSocket(options)`

Open a rabbit.js [`SUBSCRIBE`](https://github.com/squaremo/rabbit.js/blob/master/lib/sockets.js#L55)
socket to your favorite model.

| @param | @description | required |
|:---|:---|:---|
| options.where | search criteria | no |

#### Example

```js
Message.getSubscribeSocket({ where: { stream: 'myStream' } })
  .then(function (socket) {
    socket.on('data', function (data) {
      var message = JSON.parse(data);
      // see, I told you it was low-level
      
      // ...
    });
  });
```

### `Model.getWorkerSocket(options)`

| @param | @description | required |
|:---|:---|:---|
| options.name | worker name (must match that of some 'PUSH' socket) | yes |

```js
Message.getWorkerSocket({ name: 'encryptionWorker' })
  .then(function (socket) {
    socket.on('data', function (data) {
      var message = JSON.parse(data);
      // ...

      socket.ack()
    });
  });
```

## License
MIT

## Maintained By

##### [<img src='http://i.imgur.com/mfpocUM.png' height='72px'>](https://www.micollegesonline.org)
- [Max Stahl](https://github.com/mcodev1)
##### [<img src='http://i.imgur.com/zM0ynQk.jpg' height='33px'>](http://balderdash.co)
- [Travis Webb](https://github.com/tjwebb)
- [Ryan Quinn](https://github.com/ryanwilliamquinn)

<img src='http://i.imgur.com/NsAdNdJ.png'>

[mco-url]: https://www.micollegesonline.org
[mco-image]: http://i.imgur.com/mfpocUM.png
[sails-logo]: http://cdn.tjw.io/images/sails-logo.png
[sails-url]: https://sailsjs.org
[npm-image]: https://img.shields.io/npm/v/waterline-rabbitmq.svg?style=flat-square
[npm-url]: https://npmjs.org/package/waterline-rabbitmq
[ci-image]: https://img.shields.io/circleci/project/waterlinejs/rabbitmq-adapter/master.svg?style=flat-square
[ci-url]: https://circleci.com/gh/waterlinejs/rabbitmq-adapter
[daviddm-image]: http://img.shields.io/david/waterlinejs/rabbitmq-adapter.svg?style=flat-square
[daviddm-url]: https://david-dm.org/waterlinejs/rabbitmq-adapter
[codeclimate-image]: https://img.shields.io/codeclimate/github/waterlinejs/rabbitmq-adapter.svg?style=flat-square
[codeclimate-url]: https://codeclimate.com/github/waterlinejs/rabbitmq-adapter
