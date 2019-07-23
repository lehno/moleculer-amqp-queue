"use strict";

//let consumeCB = jest.fn();
//let addAMQPJob = jest.fn();

const amqp = require("amqplib");

const mockChannel = {
	consume: jest.fn(),
	assertQueue: jest.fn(),
	prefetch: jest.fn(),
	on: jest.fn(),
	sendToQueue: jest.fn()
};

const mockConnection = {
	createChannel: jest.fn(() => mockChannel)
};

amqp.connect = jest.fn(() => mockConnection);

const { ServiceBroker } = require("moleculer");
const { ServiceSchemaError } = require("moleculer").Errors;
const AMQPService = require("../../src");

describe("Test AMQPService constructor", () => {

	it("should be created with default settings", () => {
		const broker = new ServiceBroker({ logger: false });
		const service = broker.createService(AMQPService);
		
		expect(service).toBeDefined();
		expect(service.settings).toEqual({
			url: "amqp://localhost"
		});
		expect(service.AMQPConn).toBeDefined();
		expect(service.$queues).toEqual({});
	});

	it("should be created with custom settings", () => {
		const broker = new ServiceBroker({ logger: false });
		const service = broker.createService(AMQPService, {
			settings: {
				url: "amqp://rabbitmq/"
			}
		});

		expect(service).toBeDefined();
		expect(service.settings).toEqual({
			url: "amqp://rabbitmq/"
		});
		expect(service.AMQPConn).toBeDefined();
		expect(service.$queues).toEqual({});
	});

});

describe("Test AMQPService started handler", () => {
	const opts = {};

	const broker = new ServiceBroker({ logger: false });
	const service = broker.createService(AMQPService, {
		settings: {
			url: "amqp://rabbitmq"
		},

		AMQPQueues: {
			"task.first": jest.fn(),
			"task.second": jest.fn(),
		}
	});
	
	service.getAMQPQueue = jest.fn(() => mockChannel);

	beforeAll(() => broker.start());
	afterAll(() => broker.stop());

	it("should create AMQP connection & queues", () => {

		expect(service.AMQPConn).toBe(mockConnection);

		expect(service.getAMQPQueue).toHaveBeenCalledTimes(2);
		expect(service.getAMQPQueue).toHaveBeenCalledWith("task.first");
		expect(service.getAMQPQueue).toHaveBeenCalledWith("task.second");

		expect(mockChannel.consume).toHaveBeenCalledTimes(2);
		expect(mockChannel.consume).toHaveBeenCalledWith("task.first", expect.any(Function), { noAck: false });
		expect(mockChannel.consume).toHaveBeenCalledWith("task.second", expect.any(Function), { noAck: false });
	});

	it("should throw error if URL is not defined", () => {
		const broker = new ServiceBroker({ logger: false });
		const service = broker.createService(AMQPService, {
			settings: {
				url: null
			},

			AMQPQueues: {
				"task.first": jest.fn(),
				"task.second": jest.fn(),
			}
		});

		expect(broker.start()).rejects.toBeInstanceOf(ServiceSchemaError);
		return broker.stop();
	});

});

describe("Test AMQPService getAMQPQueue method", () => {
	const payload = { a: 10 };

	const broker = new ServiceBroker({ logger: false });
	const service = broker.createService(AMQPService);

	beforeAll(() => broker.start());
	afterAll(() => broker.stop());

	it("should be create queue", async () => {
		expect(service.$queues).toEqual({});
		mockConnection.createChannel.mockClear();

		const channel = await service.getAMQPQueue("test1");

		expect(channel).toBe(mockChannel);

		expect(mockConnection.createChannel).toHaveBeenCalledTimes(1);
		expect(mockConnection.createChannel).toHaveBeenCalledWith();

		expect(channel.on).toHaveBeenCalledTimes(2);
		expect(channel.on).toHaveBeenCalledWith("close", expect.any(Function));
		expect(channel.on).toHaveBeenCalledWith("error", expect.any(Function));

		expect(channel.assertQueue).toHaveBeenCalledTimes(1);
		expect(channel.assertQueue).toHaveBeenCalledWith("test1", { durable: true });

		expect(channel.prefetch).toHaveBeenCalledTimes(1);
		expect(channel.prefetch).toHaveBeenCalledWith(1);

		expect(service.$queues).toEqual({
			"test1": mockChannel
		})
	});

	it("should not create the same queue again", async () => {
		mockConnection.createChannel.mockClear();
		mockChannel.on.mockClear();
		mockChannel.assertQueue.mockClear();
		mockChannel.prefetch.mockClear();

		const channel = await service.getAMQPQueue("test1");

		expect(channel).toBe(mockChannel);

		expect(mockConnection.createChannel).toHaveBeenCalledTimes(0);
		expect(channel.on).toHaveBeenCalledTimes(0);
		expect(channel.assertQueue).toHaveBeenCalledTimes(0);
		expect(channel.prefetch).toHaveBeenCalledTimes(0);

		expect(service.$queues).toEqual({
			"test1": mockChannel
		})
	});

});

describe("Test AMQPService addAMQPJob method", () => {
	const payload = { a: 10 };

	const broker = new ServiceBroker({ logger: false });
	const service = broker.createService(AMQPService);
	service.getAMQPQueue = jest.fn(() => mockChannel);

	beforeAll(() => broker.start());
	afterAll(() => broker.stop());

	it("should be send job to queue", async () => {
		const message = { a: 5 };
		await service.addAMQPJob("job1", message)

		expect(service.getAMQPQueue).toHaveBeenCalledTimes(1);
		expect(service.getAMQPQueue).toHaveBeenCalledWith("job1");

		expect(mockChannel.sendToQueue).toHaveBeenCalledTimes(1);
		expect(mockChannel.sendToQueue).toHaveBeenCalledWith("job1", Buffer.from("{\"a\":5}"), { persistent: true });
	});

});
