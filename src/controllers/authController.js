import User from "../models/UserModel.js";
import Otp from "../models/OtpModel.js"
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { v2 as cloudinary } from 'cloudinary';
import nodemailer from "nodemailer";

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
  const {email} = req.body;
  const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();
  let otpCode = generateCode();
  const transporter = nodemailer.createTransport({
    service: "gmail", // or use smtp.ethereal.email for testing
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"Wordlink: " ${process.env.EMAIL_USER}`,
    to: email,
    subject: "Verify your email address",
    text: `Your verification code is: ${otpCode},
    Please use this code to verify your email address on Wordlink.`,
  };

  await transporter.sendMail(mailOptions);
  const otp = await Otp.findOneAndUpdate(
      { email },
      { $set: { otp, expiresAt: Date.now() + 60000 } }, // this object is correct
      { upsert: true, new: true }
    );

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
