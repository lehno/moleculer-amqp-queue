/*
 * moleculer-amqp-queue
 * Copyright (c) 2017 MoleculerJS (https://github.com/moleculerjs/moleculer-addons)
 * MIT Licensed
 */

"use strict";

const amqp = require("amqplib");
const _ = require("lodash");
const Errors = require("moleculer").Errors;

const validateOption = function (queueOption) {
	return _.defaultsDeep(queueOption, {
		channel: {
			assert: {
				durable: true,
			},
			prefetch: 1,
		},
		consume: {
			noAck: false,
		},
	});
}

module.exports = {
	name: "moleculer-amqp-queue",

	settings: {
		url: "amqp://localhost"
	},

	methods: {
		async getAMQPQueue(name) {
			if (!this.$queues[name]) {
				const queueOption = validateOption(this.$queueOptions[name]);
				try {
					let channel = await this.AMQPConn.createChannel();
					channel.on("close", () => {
						delete this.$queues[name];
					});
					channel.on("error", (err) => {
						/* istanbul ignore next */
						this.logger.error(err);
					});
					await channel.assertQueue(name, queueOption.channel.assert);
					channel.prefetch(queueOption.channel.prefetch);
					this.$queues[name] = channel;
				} catch (err) {
					this.logger.error(err);
					throw new Errors.MoleculerError("Unable to start queue");
				}
			}
			return this.$queues[name];
		},
		async addAMQPJob(name, message, options) {
			const jobOption = _.defaultsDeep(options, {
				persistent: true,
			});
			let queue = await this.getAMQPQueue(name);
			queue.sendToQueue(name, Buffer.from(JSON.stringify(message)), jobOption);
		},
	},

	created() {
		this.AMQPConn = null;
		this.$queues = {};
		this.$queueOptions = {};
	},

	async started() {
		if (!this.settings.url)
			throw new Errors.ServiceSchemaError("Missing options URL");

		try {
			this.AMQPConn = await amqp.connect(this.settings.url);
			if (this.schema.AMQPQueues) {
				_.forIn(this.schema.AMQPQueues, async (option, name) => {
					if (typeof option.handler !== "function") {
						throw new Errors.ServiceSchemaError("all AMQPQueues properties must contain handler function");
					}

					this.$queueOptions[name] = validateOption(option);
					const handler = this.$queueOptions[name].handler;
					delete this.$queueOptions[name].handler;

					let channel = await this.getAMQPQueue(name);
					channel.consume(name, handler.bind(this, channel), this.$queueOptions[name].consume);
				});
			}

		} catch (err) {
			this.logger.error(err);
			throw new Errors.MoleculerError("Unable to connect to AMQP");
		}
	}
};
