import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import path from "path";
import { fileURLToPath } from "url";


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
