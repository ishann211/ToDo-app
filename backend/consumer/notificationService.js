const amqp = require("amqplib");
const WebSocket = require("ws");

const RABBIT_URL = process.env.RABBITMQ_URL || "amqp://localhost";
const EXCHANGE = "todos.events";
const QUEUE = "todos.notification";
const ROUTING_KEY = "todo.created";
const WS_PORT = process.env.NOTIFY_WS_PORT || 4001;

// Buffer to store recent notifications for replay to new clients
const MAX_BUFFER_SIZE = 20;
let notificationBuffer = [];

async function start() {
  let conn;
  let ch;
  try {
    // Start WebSocket server FIRST so clients can connect before messages arrive
    const wss = new WebSocket.Server({ port: WS_PORT });
    console.log(`[NotificationService] WebSocket server started on port ${WS_PORT}`);

    wss.on("connection", (ws) => {
      console.log("[NotificationService] WebSocket client connected");

      // Send connection confirmation
      ws.send(
        JSON.stringify({ system: "connected", ts: new Date().toISOString() }),
      );

      // Replay buffered notifications to the newly connected client
      if (notificationBuffer.length > 0) {
        console.log(`[NotificationService] Replaying ${notificationBuffer.length} buffered notifications`);
        notificationBuffer.forEach((notification) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(notification));
          }
        });
      }
    });

    function broadcast(data) {
      const raw = JSON.stringify(data);
      wss.clients.forEach((c) => {
        if (c.readyState === WebSocket.OPEN) c.send(raw);
      });
    }

    function bufferAndBroadcast(notification) {
      // Add to buffer (keep only recent notifications)
      notificationBuffer.push(notification);
      if (notificationBuffer.length > MAX_BUFFER_SIZE) {
        notificationBuffer.shift(); // Remove oldest
      }

      // Broadcast to currently connected clients
      broadcast(notification);
    }

    // Now connect to RabbitMQ
    conn = await amqp.connect(RABBIT_URL);
    ch = await conn.createChannel();
    await ch.assertExchange(EXCHANGE, "topic", { durable: true });
    await ch.assertQueue(QUEUE, { durable: true });
    await ch.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY);

    console.log(
      "[NotificationService] Connected to RabbitMQ, waiting for messages...",
    );

    ch.consume(
      QUEUE,
      async (msg) => {
        if (!msg) return;
        try {
          const payload = JSON.parse(msg.content.toString());
          console.log(
            `[NotificationService] Received event=${payload.event} entityId=${payload.entityId} at ${new Date().toISOString()}`,
          );

          // Simulate processing delay
          await new Promise((r) => setTimeout(r, 3000));

          console.log(
            `[NotificationService] Processed event=${payload.event} entityId=${payload.entityId}`,
          );

          // Create notification and buffer + broadcast
          const notification = {
            type: "notification",
            event: payload.event,
            entityId: payload.entityId,
            timestamp: new Date().toISOString(),
            metadata: payload.metadata,
          };

          bufferAndBroadcast(notification);

          ch.ack(msg);
        } catch (err) {
          console.error("[NotificationService] Error processing message:", err);
          if (ch) ch.nack(msg, false, false);
        }
      },
      { noAck: false },
    );

    process.once("SIGINT", async () => {
      console.log("[NotificationService] Shutting down");
      try {
        if (ch) await ch.close();
        if (conn) await conn.close();
        wss.close();
      } catch (e) {
        // ignore
      }
      process.exit(0);
    });
  } catch (err) {
    console.error("[NotificationService] Start error:", err);
    try {
      if (ch) await ch.close();
      if (conn) await conn.close();
    } catch (e) { }
    process.exit(1);
  }
}

start();

