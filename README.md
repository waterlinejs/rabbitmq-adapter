# <img src="http://cdn.tjw.io/images/sails-logo.png" height='43px' /> amqp
adapter

[![NPM version][npm-image]][npm-url]
[![Build status][travis-image]][travis-url]
[![Dependency Status][daviddm-image]][daviddm-url]

AMQP Adapter for Sails and Waterline (supports RabbitMQ, ActiveMQ, et al).

## Install
```sh
$ npm install sails-amqp --save
```

## Configure

```js
// config/connections.js

module.exports.connections = {
  rabbitMQ: {
    adapter: 'sails-amqp',
    url: 'amqp://localhost',
    options: {
      frameMax: 4096,   // max message size in bytes (default: 4kb)
      channelMax: 0,    // max number of channels, 0=unlimited (default: 0)
      heartbeat: 0,     // connection heartbeat period (default: 0)
      locale: 'en_US',  // locale for error messages (default: 'en_US')
      noDelay: false    // set TCP_NODELAY on underlying socket (default: false)
    }
  }
};

```

### Usage

## License
MIT

[sails-logo]: http://cdn.tjw.io/images/sails-logo.png
[sails-url]: https://sailsjs.org
[npm-image]: https://img.shields.io/npm/v/sails-amqp.svg?style=flat-square
[npm-url]: https://npmjs.org/package/sails-amqp
[travis-image]: https://img.shields.io/travis/tjwebb/sails-amqp.svg?style=flat-square
[travis-url]: https://travis-ci.org/tjwebb/sails-amqp
[daviddm-image]: http://img.shields.io/david/tjwebb/sails-amqp.svg?style=flat-square
[daviddm-url]: https://david-dm.org/tjwebb/sails-amqp
