import express from "express";
import { WebSocketServer } from "ws";
import http from "http";
import geolib from "geolib";
import axios from "axios";

const app = express();
const PORT = process.env.PORT || 3000;

// Health check
app.get("/health", (req, res) => res.json({ status: "ok" }));

// HTTP server
const server = http.createServer(app);

// WebSocket server
const wss = new WebSocketServer({ server });

// In-memory drivers store
// { [driverId]: { id, wallet, status, vehicle_type, rate, pushToken, latitude, longitude } }
const drivers = {};

wss.on("connection", (ws) => {
  ws.on("message", async (msg) => {
    try {
      const data = JSON.parse(msg.toString());

      // ================= DRIVER LOCATION =================
      if (data.type === "locationUpdate" && data.role === "driver") {
        const { driver: driverId, data: location } = data;

        if (!drivers[driverId]) {
          // Fetch driver info ONCE
          const res = await axios.get(
            `https://nwserver2.onrender.com/api/v1/driver/socket/${driverId}`
          );

          drivers[driverId] = {
            ...res.data,
            latitude: location.latitude,
            longitude: location.longitude,
          };
        } else {
          drivers[driverId].latitude = location.latitude;
          drivers[driverId].longitude = location.longitude;
        }
      }

      // ================= USER REQUEST =================
      if (data.type === "requestRide" && data.role === "user") {
        const { latitude, longitude, vehicleType } = data;

        const nearbyDrivers = Object.values(drivers)
          .filter((d: any) => {
            const distance = geolib.getDistance(
              { latitude, longitude },
              { latitude: d.latitude, longitude: d.longitude }
            );

            return (
              distance <= 5000 &&           // 5 km
              d.wallet >= 1 &&
              d.status === "active" &&
              d.vehicle_type === vehicleType
            );
          })
          .map((d: any) => ({
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
});

// Start server
server.listen(PORT, () => {
  console.log(`✅ Express + WebSocket server running on port ${PORT}`);
});




