import 'dotenv/config';
import express from "express";
import mongoose from "mongoose";
import cors from "cors";

import path from "path";
import { fileURLToPath } from "url";
import axios from 'axios';

const url = `https://wordlinkapp.onrender.com/healthcheck`; // Create this endpoint
const interval = 14 * 60 * 1000; // 14 minutes in milliseconds

function reloadWebsite() {
  axios.get(url)
    .then(() => console.log("Self-ping successful"))
    .catch((err) => console.error("Self-ping failed:", err.message));
}

// Start the interval
setInterval(reloadWebsite, interval);

const app = express();
app.use(express.urlencoded({ extended: true }));
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(__dirname));
app.use(cors());
app.use(express.json());

// Import routes the mm
import postRoutes from "./src/routes/postRoutes.js";
import authRoutes from "./src/routes/authRoutes.js";
app.use("/api/posts", postRoutes);
app.use("/api/auths", authRoutes);

// Connect MongoDB
mongoose
  .connect(process.env.MONGODB_URI_STRING)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
app.get('/healthcheck', (req, res) => {
  res.status(200).send('Server is awake');
});