/*
 * moleculer-amqp-queue
 * Copyright (c) 2017 MoleculerJS (https://github.com/moleculerjs/moleculer-addons)
 * MIT Licensed
 */

"use strict";

const amqp = require("amqplib");
const _ = require("lodash");

module.exports = function (url) {
	return {
		settings: {
			url: url || "amqp://localhost"
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
							this.logger.error(err);
						});
						await channel.assertQueue(name, { durable: true });
						channel.prefetch(1);
						this.$queues[name] = channel;
					} catch (err) {
						this.logger.error(err);
						return this.Promise.reject("Unable to start queue");
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
			if (!this.settings.url) {
				return this.Promise.reject("Missing options URL");
			}
			try {
				this.AMQPConn = await amqp.connect(this.settings.url);
				if (this.schema.AMQPQueues) {
					_.forIn(this.schema.AMQPQueues, async (fn, name) => {
						let channel = await this.getAMQPQueue(name);
						channel.consume(name, fn.bind(this, channel), { noAck: false });
					});
				}
				return this.Promise.resolve();
			} catch (err) {
				this.logger.error(err);
				return this.Promise.reject("Unable to connect to AMQP");
			}
		}
	};
};
