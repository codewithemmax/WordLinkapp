import express from "express";
import { logIn, signUp, getProfile } from "../controllers/authController.js";
import { optionalAuthenticateToken, authenticateToken } from "../middleware/authMiddleware.js";

const app = express.Router();

app.post("/signup", signUp);
app.post("/login", logIn);
app.get("/profile", authenticateToken, getProfile)

export default app;
