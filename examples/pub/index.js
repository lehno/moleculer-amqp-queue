"use strict";

let { ServiceBroker } = require("moleculer");
let AMQPMixin = require("../../index");

let broker = new ServiceBroker({ logger: console });

broker.createService({
	name: "pub",
	mixins: [AMQPMixin()],
	started () {
		let id = 1;
		setInterval(() => {
			this.logger.info("Add a new job. ID: ", id);
			this.addAMQPJob("sample.task", { id: id++, pid: process.pid });
		}, 2000);
	}
});

broker.start();
