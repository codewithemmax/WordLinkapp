import User from "../models/UserModel.js";
import Otp from "../models/OtpModel.js"
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { v2 as cloudinary } from 'cloudinary';
import { Resend } from 'resend';

// Get all posts
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const userProfile = await User.findById(userId)
    return res.json(userProfile)
  }catch(err){
    return res.status(404).json({message: "Error getting profile"})
  }
}

export const check = async (req, res) => {
  const { username } = req.body;
  const userN = await User.findOne({ username: username });
  
  if (userN) {
    return res.status(404).json({ message: "Username has already been taken" });
  }else{
    return res.status(200).json({ message: "Available" });
  }
}

export const signUp = async (req, res) => {
  
  const imageFile = req.file;
  try{
    const { username,firstname, lastname, email, password } = req.body;
    const userN = await User.findOne({ username: username });
    const userE = await User.findOne({ email: email });
    
    if (userN) {
      return res.status(404).json({ message: "Useename has already been taken" });
    } else if (userE) {
      return res
        .status(404)
        .json({ message: "Email has already been registered" });
    }
    let profilePic = "";
    if (imageFile) {
      const result = await cloudinary.uploader.upload(imageFile.path, { folder: "wordlink_posts" });
      profilePic = result.secure_url;
    }

    console.log(`${username}, ${firstname}, ${lastname}, ${email}, ${profilePic}`);


    const passwordHashed = await bcrypt.hash(password, 10);
    const user = new User({ username, firstname, profilePic, lastname, email, passwordHashed});
    await user.save();
    res.json({ message: "Successful created an account " });
  }catch(err){
    console.error("Error during sign up:", err);
    return res.status(500).json({ message: "Error creating an account" });
  }
};

export const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  try {
    
    const record = await Otp.findOne(
      { email }
    );


    if (!record)
      return res.json({ success: false, message: "OTP not found" });

    if (record.otp !== otp)
      return res.json({ success: false, message: "Wrong OTP" });

    if (record.expiresAt < Date.now())
      return res.json({ success: false, message: "OTP expired" });

    // success
    return res.json({ success: true });
  }catch (err) {
    console.error("Error during OTP verification:", err);
    return res.status(500).json({ message: "Error verifying OTP" });
  }
};

export const sendOtp = async (req, res) => {
  const { email } = req.body;

  try {
  // 1. Generate the Code
  const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();
  let otpCode = generateCode();

  // 2. Configure Nodemailer Transporter
  const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
  user: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASS,
  },
        // Optional: Increase timeout for debugging connection issues
        // timeout: 20000 // 20 seconds
  });

  const mailOptions = {
  from: `"Wordlink: " ${process.env.EMAIL_USER}`,
  to: email,
  subject: "Verify your email address",
  text: `Your verification code is: ${otpCode}. Please use this code to verify your email address on Wordlink.`,
  };

      // 3. Send Mail - This is the line that throws the ETIMEDOUT error
  await transporter.sendMail(mailOptions);

      // 4. Save/Update OTP in Database (Using otpCode - assumes fix from previous response)
  await Otp.findOneAndUpdate(
  { email },
  { $set: { otp: otpCode, expiresAt: Date.now() + 60000 } },
  { upsert: true, new: true }
  );

  return res.json({ success: true, message: "Verification mail sent successfully" });

  } catch (err) {
    // ⬇️ THIS IS WHERE YOU CATCH THE ERROR ⬇️

    // Log the full error object for server-side debugging
    console.error("SMTP Error during email send:", err);

    // Check for the specific Connection Timeout error code
    if (err.code === 'ETIMEDOUT' || err.code === 'ESOCKET') {
        return res.status(503).json({ 
            success: false, 
            message: "Email service is temporarily unavailable. Please check your network and settings." 
        });
    }

    // Handle other errors (e.g., authentication, database issues)
     return res.status(500).json({ 
        success: false, 
        message: "An internal server error occurred while processing the request." 
    });
 }
};

export const logIn = async (req, res) => {
  const { usernameOrEmail, password } = req.body;
  const user = await User.findOne({
    $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
  });
  if (user) {
    const confirmPassword = await bcrypt.compare(password, user.passwordHashed);

    if (confirmPassword) {
      // after verifying password:
      const token = jwt.sign(
        {
          id: user._id,
          username: user.username,
          fullname: `${user.firstname} ${user.lastname}`,
          profilePic: user.profilePic
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.json({ token });
    } else {
      return res.status(401).json({ message: "Invalid Credentials" });
    }
  } else {
    return res.status(404).json({ message: "Invalid Credentials" });
  }
};
