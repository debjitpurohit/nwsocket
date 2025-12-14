const express = require("express");
const { WebSocketServer } = require("ws");
const geolib = require("geolib");
const http = require("http");

const app = express();
const PORT = process.env.PORT || 3000;

// HTTP server (IMPORTANT)
const server = http.createServer(app);

// WebSocket server attached to same HTTP server
const wss = new WebSocketServer({ server });

let drivers = {};

wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);

      // 1️⃣ Driver location update
      if (data.type === "locationUpdate" && data.role === "driver") {
        drivers[data.driver] = {
          latitude: data.data.latitude,
          longitude: data.data.longitude,
          wallet: data.data.wallet,           // wallet
          status: data.data.status,           // active/inactive
          vehicle_type: data.data.vehicle_type, 
          pushToken: data.data.pushToken,     // expo push token
          rate: data.data.rate,
        };
      }

      // 2️⃣ User requests ride
      if (data.type === "requestRide" && data.role === "user") {
        const nearbyDrivers = Object.entries(drivers)
          .filter(([id, driver]) => {
            const distance = geolib.getDistance(
              { latitude: data.latitude, longitude: data.longitude },
              { latitude: driver.latitude, longitude: driver.longitude }
            );

            // Distance filter 5 km
            if (distance > 5000) return false;

            // Wallet filter
            if (!driver.wallet || driver.wallet < 1) return false;

            // Status filter
            if (driver.status !== "active") return false;

            // Vehicle type filter
            if (driver.vehicle_type !== data.vehicleType) return false;

            return true;
          })
          .map(([id, driver]) => ({ id, ...driver }));

        // Send filtered drivers to user
        ws.send(JSON.stringify({ type: "nearbyDrivers", drivers: nearbyDrivers }));
      }

    } catch (error) {
      console.log("Failed to parse WebSocket message:", error);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


