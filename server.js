import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import geolib from "geolib";
import axios from "axios";

const app = express();
const PORT = process.env.PORT || 3000;

// Health check (Render likes this)
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

/**
 * drivers = {
 *   driverId: {
 *     state: "PENDING" | "READY",
 *     id,
 *     wallet,
 *     status,
 *     vehicle_type,
 *     rate,
 *     pushToken,
 *     latitude,
 *     longitude
 *   }
 * }
 */
const drivers = {};

wss.on("connection", (ws) => {
  ws.on("message", async (msg) => {
    try {
      const data = JSON.parse(msg.toString());

      // ================= DRIVER LOCATION =================
      if (data.type === "locationUpdate" && data.role === "driver") {
        const driverId = data.driver;
        const location = data.data;

        // First time driver seen
        if (!drivers[driverId]) {
          drivers[driverId] = {
            state: "PENDING",
            latitude: location.latitude,
            longitude: location.longitude,
          };

          // fetch driver static data in background (NO await)
          axios
            .get(
              `https://nwserver2.onrender.com/api/v1/driver/socket/${driverId}`
            )
            .then((res) => {
              drivers[driverId] = {
                ...drivers[driverId],
                ...res.data,
                state: "READY",
              };
            })
            .catch((err) => {
              console.log("Driver fetch failed:", driverId);
              delete drivers[driverId];
            });
        } else {
          // Update live location
          drivers[driverId].latitude = location.latitude;
          drivers[driverId].longitude = location.longitude;
        }
      }

      // ================= USER REQUEST =================
      if (data.type === "requestRide" && data.role === "user") {
        const { latitude, longitude, vehicleType } = data;

        const findDrivers = () =>
          Object.values(drivers)
            .filter((d) => {
              if (d.state !== "READY") return false;

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

        let nearbyDrivers = findDrivers();

        // If axios data not ready yet → wait 1.5 sec and retry once
        if (nearbyDrivers.length === 0) {
          setTimeout(() => {
            nearbyDrivers = findDrivers();
            ws.send(
              JSON.stringify({
                type: "nearbyDrivers",
                drivers: nearbyDrivers,
              })
            );
          }, 1500);
        } else {
          ws.send(
            JSON.stringify({
              type: "nearbyDrivers",
              drivers: nearbyDrivers,
            })
          );
        }
      }
    } catch (err) {
      console.error("Socket error:", err);
    }
  });
});

server.listen(PORT, () => {
  console.log(`✅ Express + WebSocket running on port ${PORT}`);
});







