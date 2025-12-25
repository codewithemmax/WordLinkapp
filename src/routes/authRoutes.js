import express from "express";
import { logIn, check, checkEmail, signUp, getProfile, verifyOtp, sendOtp } from "../controllers/authController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
import multer from 'multer'
import { verify } from "crypto";

const router = express.Router();
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 }  // 5MB max
});

router.post("/signup", upload.single('image'), signUp);
router.post("/login", logIn);
router.get("/profile", authenticateToken, getProfile);
router.post("/check", check)
router.post("/check-email", checkEmail)
router.post("/verify_otp", verifyOtp)
router.post("/send_otp", sendOtp)

export default router;