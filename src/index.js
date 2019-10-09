/*
 * moleculer-amqp-queue
 * Copyright (c) 2017 MoleculerJS (https://github.com/moleculerjs/moleculer-addons)
 * MIT Licensed
 */

"use strict";

const amqp = require("amqplib");
const _ = require("lodash");
const Errors = require("moleculer").Errors;

module.exports = {
	name: "moleculer-amqp-queue",

	settings: {
		url: "amqp://localhost"
	},

	methods: {
		async getAMQPQueue (name) {
			if (!this.$queues[name]) {
				try {
					let channel = await this.AMQPConn.createChannel();
					channel.on("close", () => {
						delete this.$queues[name];
					});
					channel.on("error", (err) => {
						/* istanbul ignore next */
						this.logger.error(err);
					});
					await channel.assertQueue(name, { durable: true });
					channel.prefetch(1);
					this.$queues[name] = channel;
				} catch (err) {
					this.logger.error(err);
					throw(MoleculerError("Unable to start queue"));
				}
			}
			return this.$queues[name];
		},
		async addAMQPJob (name, message) {
			let queue = await this.getAMQPQueue(name);
			queue.sendToQueue(name, Buffer.from(JSON.stringify(message)), { persistent: true });
		},
	},

	created () {
		this.AMQPConn = null;
		this.$queues = {};
	},

	async started () {
		if (!this.settings.url)
			throw new Errors.ServiceSchemaError("Missing options URL");

		try {
			this.AMQPConn = await amqp.connect(this.settings.url);
			if (this.schema.AMQPQueues) {
				_.forIn(this.schema.AMQPQueues, async (fn, name) => {
					let channel = await this.getAMQPQueue(name);
					channel.consume(name, fn.bind(this, channel), { noAck: false });
				});
			}

		} catch (err) {
			this.logger.error(err);
			throw new Errors.MoleculerError("Unable to connect to AMQP");
		}
	}
};
