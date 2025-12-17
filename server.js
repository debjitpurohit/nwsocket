// import express from "express";
// import { WebSocketServer } from "ws";
// import http from "http";
// import geolib from "geolib";
// import axios from "axios";

// const app = express();
// const server = http.createServer(app);
// const wss = new WebSocketServer({ server });
// const PORT = process.env.PORT || 3000;

// app.get("/health", (_, res) => res.json({ status: "ok" }));

// // driverId -> driver data
// const drivers = new Map();
// // ws -> driverId
// const socketToDriver = new Map();

// wss.on("connection", (ws) => {
//   console.log("🔌 socket connected");

//   ws.on("message", async (msg) => {
//     try {
//       const data = JSON.parse(msg.toString());

//       // ===== DRIVER HEARTBEAT / LOCATION =====
//       if (data.type === "locationUpdate" && data.role === "driver") {
//         const { driver: driverId, data: location } = data;

//         socketToDriver.set(ws, driverId);

//         if (!drivers.has(driverId)) {
//           // fetch only once
//           const res = await axios.get(
//             `https://nwserver2.onrender.com/api/v1/driver/socket/${driverId}`
//           );

//           drivers.set(driverId, {
//             ...res.data,
//             latitude: location.latitude,
//             longitude: location.longitude,
//             socket: ws,
//           });
//         } else {
//           const d = drivers.get(driverId);
//           d.latitude = location.latitude;
//           d.longitude = location.longitude;
//         }
//       }

//       // ===== USER REQUEST =====
//       if (data.type === "requestRide" && data.role === "user") {
//         const { latitude, longitude, vehicleType } = data;

//         const nearbyDrivers = [...drivers.values()]
//           .filter((d) => {
//             // 🔥 ONLY ONLINE DRIVERS
//             if (!d.socket || d.socket.readyState !== 1) return false;

//             const distance = geolib.getDistance(
//               { latitude, longitude },
//               { latitude: d.latitude, longitude: d.longitude }
//             );

//             return (
//               distance <= 5000 &&
//               d.wallet >= 1 &&
//               d.status === "active" &&
//               d.vehicle_type === vehicleType
//             );
//           })
//           .map((d) => ({
//             id: d.id,
//             latitude: d.latitude,
//             longitude: d.longitude,
//             rate: d.rate,
//             pushToken: d.pushToken,
//             vehicle_type: d.vehicle_type,
//           }));

//         ws.send(
//           JSON.stringify({
//             type: "nearbyDrivers",
//             drivers: nearbyDrivers,
//           })
//         );
//       }
//     } catch (err) {
//       console.error("Socket error:", err);
//     }
//   });

//   // 🔥 DRIVER APP CLOSED / OFFLINE
//   ws.on("close", () => {
//     const driverId = socketToDriver.get(ws);
//     if (driverId) {
//       drivers.delete(driverId);
//       socketToDriver.delete(ws);
//       console.log("❌ driver offline:", driverId);
//     }
//   });
// });

// server.listen(PORT, () =>
//   console.log(`✅ Socket server running on ${PORT}`)
// );
// import express from "express";
// import http from "http";
// import { WebSocketServer } from "ws";
// import geolib from "geolib";
// import axios from "axios";

// const app = express();
// const server = http.createServer(app);
// const wss = new WebSocketServer({ server });
// const PORT = process.env.PORT || 3000;

// app.get("/health", (_, res) => res.json({ status: "ok" }));

// // driverId -> driverData
// const drivers = new Map();
// // ws -> driverId
// const socketToDriver = new Map();

// wss.on("connection", (ws) => {
//   console.log("🔌 socket connected");

//   ws.on("message", async (msg) => {
//     try {
//       const data = JSON.parse(msg.toString());

//       // ================= HEARTBEAT =================
//       if (data.type === "heartbeat" && data.role === "driver") {
//         const driverId = data.driver;
//         if (drivers.has(driverId)) {
//           drivers.get(driverId).lastSeen = Date.now();
//         }
//         return;
//       }

//       // ================= LOCATION UPDATE =================
//       if (data.type === "locationUpdate" && data.role === "driver") {
//         const { driver: driverId, data: location } = data;
//         socketToDriver.set(ws, driverId);

//         if (!drivers.has(driverId)) {
//           // ⏳ fetch ONCE only
//           const res = await axios.get(
//             `https://nwserver2.onrender.com/api/v1/driver/socket/${driverId}`
//           );

//           drivers.set(driverId, {
//             ...res.data,
//             latitude: location.latitude,
//             longitude: location.longitude,
//             socket: ws,
//             lastSeen: Date.now(),
//           });
//         } else {
//           const d = drivers.get(driverId);
//           d.latitude = location.latitude;
//           d.longitude = location.longitude;
//           d.lastSeen = Date.now();
//         }
//       }

//       // ================= USER REQUEST =================
//       if (data.type === "requestRide" && data.role === "user") {
//         const { latitude, longitude, vehicleType } = data;
//         const now = Date.now();

//         const nearbyDrivers = [...drivers.values()]
//           .filter((d) => {
//             // ❌ socket closed
//             if (!d.socket || d.socket.readyState !== 1) return false;

//             // ❌ heartbeat missing (>12s)
//             if (now - d.lastSeen > 12000) return false;

//             const distance = geolib.getDistance(
//               { latitude, longitude },
//               { latitude: d.latitude, longitude: d.longitude }
//             );

//             return (
//               distance <= 5000 &&
//               d.wallet >= 1 &&
//               d.status === "active" &&
//               d.vehicle_type === vehicleType
//             );
//           })
//           .map((d) => ({
//             id: d.id,
//             latitude: d.latitude,
//             longitude: d.longitude,
//             rate: d.rate,
//             pushToken: d.pushToken,
//             vehicle_type: d.vehicle_type,
//           }));

//         ws.send(
//           JSON.stringify({
//             type: "nearbyDrivers",
//             drivers: nearbyDrivers,
//           })
//         );
//       }
//     } catch (err) {
//       console.error("Socket error:", err);
//     }
//   });

//   // ================= DRIVER OFFLINE =================
//   ws.on("close", () => {
//     const driverId = socketToDriver.get(ws);
//     if (driverId) {
//       drivers.delete(driverId);
//       socketToDriver.delete(ws);
//       console.log("❌ driver offline:", driverId);
//     }
//   });
// });

// server.listen(PORT, () =>
//   console.log(`✅ Socket server running on ${PORT}`)
// );
// import express from "express";
// import http from "http";
// import { WebSocketServer } from "ws";
// import geolib from "geolib";
// import axios from "axios";

// const app = express();
// const server = http.createServer(app);
// const wss = new WebSocketServer({ server });
// const PORT = process.env.PORT || 3000;

// app.get("/health", (_, res) => res.json({ status: "ok" }));

// // driverId -> driver data
// const drivers = new Map();
// // ws -> driverId
// const socketToDriver = new Map();

// wss.on("connection", (ws) => {
//   console.log("🔌 socket connected");

//   ws.on("message", async (msg) => {
//     try {
//       const data = JSON.parse(msg.toString());

//       /* ================= DRIVER LOCATION ================= */
//       if (data.type === "locationUpdate" && data.role === "driver") {
//         const { driver: driverId, data: location } = data;

//         socketToDriver.set(ws, driverId);

//         if (!drivers.has(driverId)) {
//           // ⏳ fetch ONLY ONCE
//           const res = await axios.get(
//             `https://nwserver2.onrender.com/api/v1/driver/socket/${driverId}`
//           );

//           drivers.set(driverId, {
//             ...res.data,
//             latitude: location.latitude,
//             longitude: location.longitude,
//             socket: ws,
//             lastSeen: Date.now(),
//           });

//           console.log("🟢 driver online:", driverId);
//         } else {
//           const d = drivers.get(driverId);
//           d.latitude = location.latitude;
//           d.longitude = location.longitude;
//           d.lastSeen = Date.now();
//         }
//       }

//       /* ================= DRIVER HEARTBEAT ================= */
//       if (data.type === "heartbeat" && data.role === "driver") {
//         const driverId = data.driver;
//         if (drivers.has(driverId)) {
//           drivers.get(driverId).lastSeen = Date.now();
//         }
//       }

//       /* ================= USER REQUEST ================= */
//       if (data.type === "requestRide" && data.role === "user") {
//         const { latitude, longitude, vehicleType } = data;

//         const nearbyDrivers = [...drivers.values()]
//           .filter((d) => {
//             // only ONLINE sockets
//             if (!d.socket || d.socket.readyState !== 1) return false;

//             const distance = geolib.getDistance(
//               { latitude, longitude },
//               { latitude: d.latitude, longitude: d.longitude }
//             );

//             return (
//               distance <= 5000 &&
//               d.wallet >= 1 &&
//               d.status === "active" &&
//               d.vehicle_type === vehicleType
//             );
//           })
//           .map((d) => ({
//             id: d.id,
//             latitude: d.latitude,
//             longitude: d.longitude,
//             rate: d.rate,
//             pushToken: d.pushToken,
//             vehicle_type: d.vehicle_type,
//           }));

//         ws.send(
//           JSON.stringify({
//             type: "nearbyDrivers",
//             drivers: nearbyDrivers,
//           })
//         );
//       }
//     } catch (err) {
//       console.error("Socket error:", err);
//     }
//   });

//   /* ================= DRIVER OFFLINE ================= */
//   ws.on("close", () => {
//     const driverId = socketToDriver.get(ws);
//     if (driverId) {
//       drivers.delete(driverId);
//       socketToDriver.delete(ws);
//       console.log("❌ driver offline:", driverId);
//     }
//   });
// });

// /* ================= HEARTBEAT CLEANUP ================= */
// setInterval(() => {
//   const now = Date.now();
//   for (const [id, d] of drivers.entries()) {
//     if (now - d.lastSeen > 15000) {
//       drivers.delete(id);
//       console.log("⛔ heartbeat timeout:", id);
//     }
//   }
// }, 5000);

// server.listen(PORT, () =>
//   console.log(`✅ Socket server running on ${PORT}`)
// );
// import express from "express";
// import http from "http";
// import { WebSocketServer } from "ws";
// import geolib from "geolib";
// import axios from "axios";

// const app = express();
// const server = http.createServer(app);
// const wss = new WebSocketServer({ server });

// const PORT = process.env.PORT || 3000;

// // ===============================
// // DRIVER MEMORY
// // ===============================
// const drivers = new Map();       // driverId -> driverData
// const socketToDriver = new Map(); // ws -> driverId

// // ===============================
// // HEALTH CHECK
// // ===============================
// app.get("/health", (_, res) => {
//   res.json({ status: "ok" });
// });

// // ===============================
// // SOCKET CONNECTION
// // ===============================
// wss.on("connection", (ws) => {
//   console.log("🔌 socket connected");

//   ws.on("message", async (msg) => {
//     try {
//       const data = JSON.parse(msg.toString());

//       // ===============================
//       // LOCATION UPDATE
//       // ===============================
//       if (data.type === "locationUpdate" && data.role === "driver") {
//         const driverId = data.driver;
//         const location = data.data;

//         socketToDriver.set(ws, driverId);

//         if (!drivers.has(driverId)) {
//           // fetch driver once
//           const res = await axios.get(
//             `https://nwserver2.onrender.com/api/v1/driver/socket/${driverId}`
//           );

//           drivers.set(driverId, {
//             id: res.data.id,
//             latitude: location.latitude,
//             longitude: location.longitude,
//             wallet: res.data.wallet,
//             rate: res.data.rate,
//             vehicle_type: res.data.vehicle_type,
//             pushToken: res.data.pushToken,
//             status: res.data.status || "inactive",
//             socket: ws,
//             lastSeen: Date.now(),
//           });

//           console.log("🟢 driver registered:", driverId);
//         } else {
//           const d = drivers.get(driverId);
//           d.latitude = location.latitude;
//           d.longitude = location.longitude;
//           d.lastSeen = Date.now();
//         }
//       }

//       // ===============================
//       // HEARTBEAT
//       // ===============================
//       if (data.type === "heartbeat" && data.role === "driver") {
//         const driverId = data.driver;
//         if (drivers.has(driverId)) {
//           drivers.get(driverId).lastSeen = Date.now();
//         }
//       }

//       // ===============================
//       // STATUS TOGGLE (ON / OFF)
//       // ===============================
//       if (data.type === "statusUpdate" && data.role === "driver") {
//         const { driver: driverId, status } = data;

//         if (drivers.has(driverId)) {
//           drivers.get(driverId).status = status;
//         }

//         if (status === "inactive") {
//           drivers.delete(driverId);
//           console.log("🔴 driver inactive:", driverId);
//         } else {
//           console.log("🟢 driver active:", driverId);
//         }
//       }

//       // ===============================
//       // USER REQUEST RIDE
//       // ===============================
//       if (data.type === "requestRide" && data.role === "user") {
//         const { latitude, longitude, vehicleType } = data;
//         const now = Date.now();

//         const nearbyDrivers = [...drivers.values()]
//           .filter((d) => {
//             if (!d.socket || d.socket.readyState !== 1) return false;
//             if (now - d.lastSeen > 15000) return false;
//             if (d.status !== "active") return false;
//             if (d.wallet < 1) return false;
//             if (d.vehicle_type !== vehicleType) return false;

//             const distance = geolib.getDistance(
//               { latitude, longitude },
//               { latitude: d.latitude, longitude: d.longitude }
//             );

//             return distance <= 5000;
//           })
//           .map((d) => ({
//             id: d.id,
//             latitude: d.latitude,
//             longitude: d.longitude,
//             rate: d.rate,
//             pushToken: d.pushToken,
//             vehicle_type: d.vehicle_type,
//           }));

//         ws.send(
//           JSON.stringify({
//             type: "nearbyDrivers",
//             drivers: nearbyDrivers,
//           })
//         );
//       }
//     } catch (err) {
//       console.error("❌ socket error:", err);
//     }
//   });

//   // ===============================
//   // SOCKET CLOSE (APP KILLED)
//   // ===============================
//   ws.on("close", async () => {
//     const driverId = socketToDriver.get(ws);

//     if (driverId) {
//       drivers.delete(driverId);
//       socketToDriver.delete(ws);

//       // 🔥 AUTO INACTIVE IN DB
//       try {
//         await axios.put(
//           `https://nwserver2.onrender.com/api/v1/driver/update-status/internal`,
//           {
//             driverId,
//             status: "inactive",
//           }
//         );
//       } catch (e) {
//         console.log("DB inactive update failed:", driverId);
//       }

//       console.log("❌ driver disconnected → inactive:", driverId);
//     }
//   });
// });

// // ===============================
// // HEARTBEAT CLEANUP (BACKGROUND KILL)
// // ===============================
// setInterval(async () => {
//   const now = Date.now();

//   for (const [id, d] of drivers.entries()) {
//     if (now - d.lastSeen > 15000) {
//       drivers.delete(id);

//       try {
//         await axios.put(
//           `https://nwserver2.onrender.com/api/v1/driver/update-status/internal`,
//           {
//             driverId: id,
//             status: "inactive",
//           }
//         );
//       } catch (e) {
//         console.log("DB inactive update failed:", id);
//       }

//       console.log("⛔ heartbeat timeout → inactive:", id);
//     }
//   }
// }, 5000);

// // ===============================
// // START SERVER
// // ===============================
// server.listen(PORT, () => {
//   console.log(`✅ Socket server running on ${PORT}`);
// });
import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import geolib from "geolib";
import axios from "axios";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;

// ===============================
// MEMORY
// ===============================
const drivers = new Map();         // driverId -> driverData
const socketToDriver = new Map();  // ws -> driverId
const userRequestLock = new Map(); // ws -> timestamp

// ===============================
// HEALTH CHECK
// ===============================
app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

// ===============================
// SOCKET CONNECTION
// ===============================
wss.on("connection", (ws) => {
  console.log("🔌 socket connected");

  ws.on("message", async (msg) => {
    try {
      const data = JSON.parse(msg.toString());

      // ===============================
      // DRIVER LOCATION UPDATE
      // ===============================
      if (data.type === "locationUpdate" && data.role === "driver") {
        const driverId = data.driver;
        const location = data.data;

        // 🔒 ensure ONE socket per driver
        if (drivers.has(driverId)) {
          const old = drivers.get(driverId);
          if (old.socket !== ws) {
            try {
              old.socket.close();
            } catch {}
          }
        }

        // clean old socket mapping
        for (const [sock, dId] of socketToDriver.entries()) {
          if (dId === driverId && sock !== ws) {
            socketToDriver.delete(sock);
          }
        }

        socketToDriver.set(ws, driverId);

        if (!drivers.has(driverId)) {
          const res = await axios.get(
            `https://nwserver2.onrender.com/api/v1/driver/socket/${driverId}`
          );

          if (res.data.isBlocked) return;

          drivers.set(driverId, {
            id: res.data.id,
            latitude: location.latitude,
            longitude: location.longitude,
            wallet: res.data.wallet,
            rate: res.data.rate,
            vehicle_type: res.data.vehicle_type,
            pushToken: res.data.pushToken,
            status: res.data.status || "inactive",
            socket: ws,
            lastSeen: Date.now(),
          });

          console.log("🟢 driver registered:", driverId);
        } else {
          const d = drivers.get(driverId);
          d.latitude = location.latitude;
          d.longitude = location.longitude;
          d.lastSeen = Date.now();
          d.socket = ws;
        }
      }

      // ===============================
      // DRIVER HEARTBEAT
      // ===============================
      if (data.type === "heartbeat" && data.role === "driver") {
        const driverId = data.driver;
        if (drivers.has(driverId)) {
          drivers.get(driverId).lastSeen = Date.now();
        }
      }

      // ===============================
      // DRIVER STATUS UPDATE
      // ===============================
      if (data.type === "statusUpdate" && data.role === "driver") {
        const { driver: driverId, status } = data;

        if (drivers.has(driverId)) {
          const d = drivers.get(driverId);
          d.status = status;

          if (status === "inactive") {
            try {
              d.socket.close();
            } catch {}
            drivers.delete(driverId);
            socketToDriver.delete(d.socket);

            console.log("🔴 driver inactive:", driverId);
          } else {
            console.log("🟢 driver active:", driverId);
          }
        }
      }

      // ===============================
      // USER REQUEST RIDE (DEDUPED)
      // ===============================
      if (data.type === "requestRide" && data.role === "user") {
        const last = userRequestLock.get(ws);
        if (last && Date.now() - last < 3000) return; // ⛔ prevent spam
        userRequestLock.set(ws, Date.now());

        const { latitude, longitude, vehicleType } = data;
        const now = Date.now();

        const nearbyDrivers = [...drivers.values()]
          .filter((d) => {
            if (!d.socket || d.socket.readyState !== 1) return false;
            if (now - d.lastSeen > 15000) return false;
            if (d.status !== "active") return false;
            if (d.wallet < 1) return false;
            if (d.vehicle_type !== vehicleType) return false;

            const distance = geolib.getDistance(
              { latitude, longitude },
              { latitude: d.latitude, longitude: d.longitude }
            );

            return distance <= 5000;
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
      console.error("❌ socket error:", err);
    }
  });

  // ===============================
  // SOCKET CLOSE
  // ===============================
  ws.on("close", async () => {
    const driverId = socketToDriver.get(ws);
    userRequestLock.delete(ws);

    if (driverId) {
      drivers.delete(driverId);
      socketToDriver.delete(ws);

      try {
        await axios.put(
          `https://nwserver2.onrender.com/api/v1/driver/update-status/internal`,
          { driverId, status: "inactive" }
        );
      } catch {}

      console.log("❌ driver disconnected:", driverId);
    }
  });
});

// ===============================
// HEARTBEAT + BLOCK CLEANUP
// ===============================
setInterval(async () => {
  const now = Date.now();

  for (const [driverId, d] of drivers.entries()) {

    // ⛔ HEARTBEAT TIMEOUT
    if (now - d.lastSeen > 15000) {
      try {
        d.socket.close();
      } catch {}

      drivers.delete(driverId);
      socketToDriver.delete(d.socket);

      try {
        await axios.put(
          `https://nwserver2.onrender.com/api/v1/driver/update-status/internal`,
          { driverId, status: "inactive" }
        );
      } catch {}

      console.log("⛔ heartbeat timeout:", driverId);
      continue;
    }

    // ⛔ BLOCK CHECK
    try {
      const res = await axios.get(
        `https://nwserver2.onrender.com/api/v1/driver/socket/${driverId}`
      );

      if (res.data.isBlocked) {
        try {
          d.socket.close();
        } catch {}

        drivers.delete(driverId);
        socketToDriver.delete(d.socket);

        console.log("⛔ auto blocked:", driverId);
      }
    } catch {
      try {
        d.socket.close();
      } catch {}

      drivers.delete(driverId);
      socketToDriver.delete(d.socket);
    }
  }
}, 5000);

// ===============================
// START SERVER
// ===============================
server.listen(PORT, () => {
  console.log(`✅ Socket server running on ${PORT}`);
});
