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

      if (data.type === "locationUpdate" && data.role === "driver") {
        drivers[data.driver] = {
          latitude: data.data.latitude,
          longitude: data.data.longitude,
        };
      }

      if (data.type === "requestRide" && data.role === "user") {
        const nearbyDrivers = findNearbyDrivers(data.latitude, data.longitude);
        ws.send(JSON.stringify({ type: "nearbyDrivers", drivers: nearbyDrivers }));
      }

    } catch (error) {
      console.log("Failed to parse WebSocket message:", error);
    }
  });
});

const findNearbyDrivers = (userLat, userLon) => {
  return Object.entries(drivers)
    .filter(([id, location]) => {
      const distance = geolib.getDistance(
        { latitude: userLat, longitude: userLon },
        location
      );
      return distance <= 5000;
    })
    .map(([id, location]) => ({ id, ...location }));
};

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
