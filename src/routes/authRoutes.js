import express from "express";
import { logIn, check, signUp, getProfile } from "../controllers/authController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
import multer from 'multer'

const router = express.Router();
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 }  // 5MB max
});

router.post("/signup",upload.single('image'), signUp);
router.post("/login", logIn);
router.get("/profile", authenticateToken, getProfile);
router.post("/check", check)

export default router;