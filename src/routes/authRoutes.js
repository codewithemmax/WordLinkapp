const express = require('express');
const { logIn, check, checkEmail, signUp, getProfile, verifyOtp, sendOtp, updateProfile } = require('../controllers/authController.js');
const { authenticateToken } = require('../middleware/authMiddleware.js');
const multer = require('multer');

const router = express.Router();
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 }
});

router.post("/signup", upload.single('image'), signUp);
router.post("/login", logIn);
router.get("/profile", authenticateToken, getProfile);
router.post("/check", check)
router.post("/check-email", checkEmail)
router.post("/verify_otp", verifyOtp)
router.post("/send_otp", sendOtp)
router.put("/update-profile", authenticateToken, upload.single('profilePic'), updateProfile)

module.exports = router;