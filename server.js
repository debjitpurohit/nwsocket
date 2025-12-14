import express from "express";
import { WebSocketServer } from "ws";
import http from "http";
import geolib from "geolib";
import axios from "axios";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const PORT = process.env.PORT || 3000;

app.get("/health", (_, res) => res.json({ status: "ok" }));

// driverId -> driver data
const drivers = new Map();
// ws -> driverId
const socketToDriver = new Map();

wss.on("connection", (ws) => {
  console.log("🔌 socket connected");

  ws.on("message", async (msg) => {
    try {
      const data = JSON.parse(msg.toString());

      // ===== DRIVER HEARTBEAT / LOCATION =====
      if (data.type === "locationUpdate" && data.role === "driver") {
        const { driver: driverId, data: location } = data;

        socketToDriver.set(ws, driverId);

        if (!drivers.has(driverId)) {
          // fetch only once
          const res = await axios.get(
            `https://nwserver2.onrender.com/api/v1/driver/socket/${driverId}`
          );

          drivers.set(driverId, {
            ...res.data,
            latitude: location.latitude,
            longitude: location.longitude,
            socket: ws,
          });
        } else {
          const d = drivers.get(driverId);
          d.latitude = location.latitude;
          d.longitude = location.longitude;
        }
      }

      // ===== USER REQUEST =====
      if (data.type === "requestRide" && data.role === "user") {
        const { latitude, longitude, vehicleType } = data;

        const nearbyDrivers = [...drivers.values()]
          .filter((d) => {
            // 🔥 ONLY ONLINE DRIVERS
            if (!d.socket || d.socket.readyState !== 1) return false;

            const distance = geolib.getDistance(
              { latitude, longitude },
              { latitude: d.latitude, longitude: d.longitude }
            );

            return (
              distance <= 5000 &&
              d.wallet >= 1 &&
              d.status === "active" &&
              d.vehicle_type === vehicleType
            );
          })
          .map((d) => ({
            id: d.id,
            latitude: d.latitude,
            longitude: d.longitude,
            rate: d.rate,
            pushToken: d.pushToken,
            vehicle_type: d.vehicle_type,
          }));

        ws.send(
          JSON.stringify({
            type: "nearbyDrivers",
            drivers: nearbyDrivers,
          })
        );
      }
    } catch (err) {
      console.error("Socket error:", err);
    }
  });

  // 🔥 DRIVER APP CLOSED / OFFLINE
  ws.on("close", () => {
    const driverId = socketToDriver.get(ws);
    if (driverId) {
      drivers.delete(driverId);
      socketToDriver.delete(ws);
      console.log("❌ driver offline:", driverId);
    }
  });
});

server.listen(PORT, () =>
  console.log(`✅ Socket server running on ${PORT}`)
);
