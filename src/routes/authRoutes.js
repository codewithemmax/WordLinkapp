import express from "express";
import { logIn, signUp, getProfile } from "../controllers/authController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/signup", signUp);
router.post("/login", logIn);
router.get("/profile", authenticateToken, getProfile);

export default router;