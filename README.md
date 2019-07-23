![Moleculer logo](http://moleculer.services/images/banner.png)

# moleculer-amqp-queue [![NPM version](https://img.shields.io/npm/v/moleculer-amqp-queue.svg)](https://www.npmjs.com/package/moleculer-amqp-queue)

Task queue mixin for [AMQP](https://www.amqp.org/).

# Install

```bash
$ npm install moleculer-amqp-queue --save
```

# Usage

## Create queue worker service
```js
const AMQPMixin = require("moleculer-amqp-queue");

broker.createService({
	name: "task-worker",
	mixins: [AMQPMixin()],
	AMQPQueues: {
		"sample.task" (channel, msg) {
			let job = JSON.parse(msg.content.toString());
			this.logger.info("New job received!", job.id);
			setTimeout(() => {
				channel.ack(msg);
			}, 500);
		}
	}
});
```

## Create job in service
```js
const QueueService = require("moleculer-amqp-queue");

broker.createService({
    name: "job-maker",
    mixins: [QueueService()],
    methods: {
        sampleTask(data) {
            const job = this.addAMQPJob("sample.task", data);
        }
    }
});
```

# Test
```
$ npm test
```

In development with watching

```
$ npm run ci
```

# License
The project is available under the [MIT license](https://tldrlegal.com/license/mit-license).

# Contact
Copyright (c) 2016-2018 MoleculerJS

[![@moleculerjs](https://img.shields.io/badge/github-moleculerjs-green.svg)](https://github.com/moleculerjs) [![@MoleculerJS](https://img.shields.io/badge/twitter-MoleculerJS-blue.svg)](https://twitter.com/MoleculerJS)
