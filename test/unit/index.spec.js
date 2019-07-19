"use strict";

jest.mock("amqplib");

let consumeCB = jest.fn();
let addAMQPJob = jest.fn();

let Queue = require("amqplib");
Queue.mockImplementation(() => ({
	consume: consumeCB,
	addAMQPJob: addAMQPJob
}));

const { ServiceBroker } = require("moleculer");
const AMQPService = require("../../src");

describe("Test AMQPService constructor", () => {
	const broker = new ServiceBroker({ logger: false });
	const service = broker.createService(AMQPService());

	it("should be created", () => {
		expect(service).toBeDefined();
		expect(service.$queues).toBeDefined();
	});

});

describe("Test AMQPService started handler", () => {
	const opts = {};

	const broker = new ServiceBroker({ logger: false });
	const service = broker.createService({
		mixins: [AMQPService(opts)],

		AMQPQueues: {
			"task.first": jest.fn(),
			"task.second": jest.fn(),
		}
	});

	beforeAll(() => service._start());

	it("should be created queues", () => {
		expect(service).toBeDefined();
		expect(Object.keys(service.$queues).length).toBe(2);
		expect(service.$queues["task.first"]).toBeDefined();
		expect(service.$queues["task.second"]).toBeDefined();

		expect(Queue).toHaveBeenCalledTimes(2);
		expect(Queue).toHaveBeenCalledWith("task.first", opts);
		expect(Queue).toHaveBeenCalledWith("task.second", opts);

		expect(consumeCB).toHaveBeenCalledTimes(2);
	});

});

describe("Test AMQPService created handler", () => {
	const payload = { a: 10 };

	const broker = new ServiceBroker({ logger: false });
	const service = broker.createService({
		mixins: [AMQPService()]
	});

	it("should be call getQueue", () => {
		service.getQueue = jest.fn(() => ({ createJob: addAMQPJob }));

		service.createJob("task.first", payload);

		expect(service.getQueue).toHaveBeenCalledTimes(1);
		expect(service.getQueue).toHaveBeenCalledWith("task.first");

		expect(addAMQPJob).toHaveBeenCalledTimes(1);
		expect(addAMQPJob).toHaveBeenCalledWith(payload);
	});

});
