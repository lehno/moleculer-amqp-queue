/*
 * moleculer-amqp-queue
 * Copyright (c) 2017 MoleculerJS (https://github.com/moleculerjs/moleculer-addons)
 * MIT Licensed
 */

"use strict";

const _ = require("lodash");
const amqp = require("amqplib");
let AMQPConn = null;

module.exports = function createService (url) {

	/**
	 * Task queue mixin service for AMQP
	 *
	 * @name moleculer-amqp-queue
	 * @module Service
	 */
	return {
		name: "amqp-queue",

		/**
		 * Settings
		 */
		settings: {
			url: url || "amqp://localhost"
		},

		/**
		 * Methods
		 */
		methods: {
			/**
			 * Create a new job
			 *
			 * @param {String} name
			 * @param {any} message
			 */
			async addAMQPJob (name, message) {
				let queue = await this.getAMQPQueue(name);
				queue.sendToQueue(name, Buffer.from(JSON.stringify(message)), { persistent: true });
			},

			/**
			 * Get a queue by name
			 *
			 * @param {String} name
			 * @returns {Promise<*>}
			 */
			async getAMQPQueue (name) {
				if (!this.$queues[name]) {
					try {
						let channel = await AMQPConn.createChannel();
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
			}
		},

		/**
		 * Service created lifecycle event handler
		 */
		created () {
			this.$queues = {};
		},

		/**
		 * Service started lifecycle event handler
		 */
		async started () {
			if (!this.settings.url) {
				return this.Promise.reject("Missing options URL");
			}
			try {
				AMQPConn = await amqp.connect(this.settings.url);
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
