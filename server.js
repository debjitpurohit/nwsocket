import express from "express";
import { WebSocketServer } from "ws";
import http from "http";
import geolib from "geolib";
import axios from "axios";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;

// driverId -> driver data
const drivers = {};

wss.on("connection", (ws) => {
  let currentDriverId = null;

  ws.on("message", async (msg) => {
    try {
      const data = JSON.parse(msg.toString());

      // ================= DRIVER LOCATION / HEARTBEAT =================
      if (data.type === "locationUpdate" && data.role === "driver") {
        const { driver: driverId, data: location } = data;
        currentDriverId = driverId;

        if (!drivers[driverId]) {
          const res = await axios.get(
            `https://nwserver2.onrender.com/api/v1/driver/socket/${driverId}`
          );

          drivers[driverId] = {
            ...res.data,
            latitude: location.latitude,
            longitude: location.longitude,
            lastSeen: Date.now(),
          };
        } else {
          drivers[driverId].latitude = location.latitude;
          drivers[driverId].longitude = location.longitude;
          drivers[driverId].lastSeen = Date.now();
        }
      }

      // ================= USER REQUEST =================
      if (data.type === "requestRide" && data.role === "user") {
        const { latitude, longitude, vehicleType } = data;

        const nearbyDrivers = Object.values(drivers)
          .filter((d) => {
            const distance = geolib.getDistance(
              { latitude, longitude },
              { latitude: d.latitude, longitude: d.longitude }
            );

            return (
              distance <= 5000 &&
              d.wallet >= 1 &&
              d.status === "active" &&
              d.vehicle_type === vehicleType &&
              Date.now() - d.lastSeen < 15000 // 🔥 very important
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
      console.log("Socket error:", err);
    }
  });

  // ================= DRIVER DISCONNECT =================
  ws.on("close", () => {
    if (currentDriverId) {
      delete drivers[currentDriverId];
    }
  });
});

// ================= CLEANUP OFFLINE DRIVERS =================
setInterval(() => {
  const now = Date.now();
  for (const id in drivers) {
    if (now - drivers[id].lastSeen > 20000) {
      delete drivers[id];
    }
  }
}, 5000);

server.listen(PORT, () =>
  console.log(`✅ Socket server running on ${PORT}`)
);


