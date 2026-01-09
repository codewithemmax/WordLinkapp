require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const axios = require('axios');
const url = `https://wordlinkapp.onrender.com/healthcheck`;
const interval = 14 * 60 * 1000;

function reloadWebsite() {
  axios.get(url)
    .then(() => console.log("Self-ping successful"))
    .catch((err) => console.error("Self-ping failed:", err.message));
}

setInterval(reloadWebsite, interval);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(express.urlencoded({ extended: true }));
const __dirname = path.resolve();

app.use(express.static(__dirname));
app.use(cors());
app.use(express.json());

// Make io available to routes
app.set('io', io);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Import routes
const postRoutes = require('./src/routes/postRoutes.js');
const authRoutes = require('./src/routes/authRoutes.js');
app.use("/api/posts", postRoutes);
app.use("/api/auths", authRoutes);

// Connect MongoDB
mongoose
  .connect(process.env.MONGODB_URI_STRING)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
app.get('/healthcheck', (req, res) => {
  res.status(200).send('Server is awake');
});