"use strict";

let { ServiceBroker } = require("moleculer");
let AMQPMixin = require("../../index");

let broker = new ServiceBroker({ logger: console });

broker.createService({
	name: "pub",
	mixins: [AMQPMixin()],
	started () {
		let id = 1;
		setInterval(async () => {
			this.logger.info("Add a new job. ID: ", id);
			this.addAMQPJob("sample.task", { id: id++, pid: process.pid });
		}, 2000);
	}
});

broker.createService({
	name: "task-worker",
	mixins: [AMQPMixin()],
	AMQPQueues: {
		"sample.task" (channel, msg) {
			let job = JSON.parse(msg.content.toString());
			this.logger.info("New job received!", job.id);
			setTimeout(() => {
				channel.ack(msg);
			}, 5000);
		}
	}
});

broker.start();
