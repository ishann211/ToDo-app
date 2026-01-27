const amqp = require("amqplib");

const RABBIT_URL = process.env.RABBITMQ_URL || "amqp://localhost";
const EXCHANGE = "todos.events";

let connection = null;
let channel = null;

async function init() {
  if (channel) return channel;
  connection = await amqp.connect(RABBIT_URL);
  channel = await connection.createChannel();
  await channel.assertExchange(EXCHANGE, "topic", { durable: true });
  return channel;
}

async function publish(eventName, payload) {
  try {
    const ch = await init();
    const routingKey = eventName;
    const buf = Buffer.from(JSON.stringify(payload));
    const ok = ch.publish(EXCHANGE, routingKey, buf, { persistent: true });
    return ok;
  } catch (err) {
    console.error("EventBus publish error:", err);
    throw err;
  }
}

async function close() {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
  } catch (err) {
    console.error("EventBus close error:", err);
  }
}

module.exports = { publish, init, close, EXCHANGE };
