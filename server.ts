import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import mqtt from "mqtt";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// WebSocket and MQTT logic (Only if not on Vercel)
if (!process.env.VERCEL) {
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const mqttBroker = process.env.MQTT_BROKER_URL || "mqtt://broker.hivemq.com";
  const mqttTopic = process.env.MQTT_TOPIC || "robot/arm/telemetry";

  console.log(`Connecting to MQTT Broker: ${mqttBroker}`);
  const mqttClient = mqtt.connect(mqttBroker);

  mqttClient.on("connect", () => {
    console.log("Connected to MQTT Broker");
    mqttClient.subscribe(mqttTopic);
  });

  mqttClient.on("message", (topic, message) => {
    try {
      const data = JSON.parse(message.toString());
      io.emit("robot_data", { ...data, timestamp: Date.now(), source: "mqtt" });
    } catch (e) {
      console.error("Failed to parse MQTT message", e);
    }
  });

  // Simulator Mode
  let simulatorEnabled = true;
  setInterval(() => {
    if (simulatorEnabled) {
      const t = Date.now() / 1000;
      const data = {
        base: 90 + Math.sin(t) * 45,
        shoulder: 45 + Math.cos(t * 0.8) * 30,
        elbow: 90 + Math.sin(t * 1.2) * 40,
        wrist_pitch: Math.sin(t * 2) * 20,
        wrist_roll: (t * 50) % 360,
        gripper: 20 + Math.sin(t * 3) * 10,
        timestamp: Date.now(),
        source: "simulator"
      };
      io.emit("robot_data", data);
    }
  }, 100);

  io.on("connection", (socket) => {
    console.log("Client connected to WebSocket");
    socket.on("toggle_simulator", (enabled: boolean) => {
      simulatorEnabled = enabled;
      console.log(`Simulator ${enabled ? "enabled" : "disabled"}`);
    });

    socket.on("manual_control", (data: any) => {
      io.emit("robot_data", { ...data, timestamp: Date.now(), source: "manual" });
      const mqttTopicCmd = process.env.MQTT_TOPIC_COMMAND || "robot/arm/command";
      mqttClient.publish(mqttTopicCmd, JSON.stringify(data));
    });
  });

  const PORT = 3000;
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Vite middleware for development
async function setupApp() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
}

await setupApp();

export default app;
