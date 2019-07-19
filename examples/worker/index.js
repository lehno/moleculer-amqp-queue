"use strict";

let { ServiceBroker } = require("moleculer");
let AMQPMixin = require("../../index");

let broker = new ServiceBroker({ logger: console });

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

broker.start();
