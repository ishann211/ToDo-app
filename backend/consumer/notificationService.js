const amqp = require("amqplib");

const RABBIT_URL = process.env.RABBITMQ_URL || "amqp://localhost";
const EXCHANGE = "todos.events";
const QUEUE = "todos.notification";
const ROUTING_KEY = "todo.created";

async function start() {
  try {
    const conn = await amqp.connect(RABBIT_URL);
    const ch = await conn.createChannel();
    await ch.assertExchange(EXCHANGE, "topic", { durable: true });
    await ch.assertQueue(QUEUE, { durable: true });
    await ch.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY);

    console.log("[NotificationService] Waiting for messages...");

    ch.consume(
      QUEUE,
      async (msg) => {
        if (!msg) return;
        try {
          const payload = JSON.parse(msg.content.toString());
          console.log(
            `[NotificationService] Received event=${payload.event} entityId=${payload.entityId} at ${new Date().toISOString()}`,
          );

          // Simulate processing delay (to demonstrate asynchronicity)
          await new Promise((r) => setTimeout(r, 3000));

          console.log(
            `[NotificationService] Processed event=${payload.event} entityId=${payload.entityId}`,
          );
          ch.ack(msg);
        } catch (err) {
          console.error("[NotificationService] Error processing message:", err);
          ch.nack(msg, false, false);
        }
      },
      { noAck: false },
    );

    process.once("SIGINT", async () => {
      console.log("[NotificationService] Shutting down");
      await ch.close();
      await conn.close();
      process.exit(0);
    });
  } catch (err) {
    console.error("[NotificationService] Start error:", err);
    process.exit(1);
  }
}

start();
