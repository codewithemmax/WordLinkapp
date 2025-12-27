import User from "../models/UserModel.js";
import Otp from "../models/OtpModel.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { v2 as cloudinary } from 'cloudinary';
import * as Brevo from '@getbrevo/brevo'; // Updated import

// Get all posts
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const userProfile = await User.findById(userId);
    return res.json(userProfile);
  } catch (err) {
    return res.status(404).json({ message: "Error getting profile" });
  }
};

export const check = async (req, res) => {
  const { username } = req.body;
  const userN = await User.findOne({ username: username });
  
  if (userN) {
    return res.status(404).json({ message: "Username has already been taken" });
  } else {
    return res.status(200).json({ message: "Available" });
  }
};

export const checkEmail = async (req, res) => {
  const { email } = req.body;
  const userE = await User.findOne({ email: email });
  
  if (userE) {
    return res.status(404).json({ message: "Email has already been registered" });
  } else {
    return res.status(200).json({ message: "Available" });
  }
};

export const signUp = async (req, res) => {
  const imageFile = req.file;
  try {
    const { username, firstname, lastname, email, password } = req.body;
    const userN = await User.findOne({ username: username });
    const userE = await User.findOne({ email: email });
    
    if (userN) {
      return res.status(404).json({ message: "Username has already been taken" });
    } else if (userE) {
      return res.status(404).json({ message: "Email has already been registered" });
    }

    let profilePic = "";
    if (imageFile) {
      const result = await cloudinary.uploader.upload(imageFile.path, { folder: "wordlink_posts" });
      profilePic = result.secure_url;
    }

    const passwordHashed = await bcrypt.hash(password, 10);
    const user = new User({ username, firstname, profilePic, lastname, email, passwordHashed });
    await user.save();
    res.json({ message: "Successfully created an account" });
  } catch (err) {
    console.error("Error during sign up:", err);
    return res.status(500).json({ message: "Error creating an account" });
  }
};

export const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const record = await Otp.findOne({ email });

    if (!record)
      return res.json({ success: false, message: "OTP not found" });

    if (record.otp !== otp)
      return res.json({ success: false, message: "Wrong OTP" });

    if (record.expiresAt < Date.now())
      return res.json({ success: false, message: "OTP expired" });

    return res.json({ success: true });
  } catch (err) {
    console.error("Error during OTP verification:", err);
    return res.status(500).json({ message: "Error verifying OTP" });
  }
};

export const sendOtp = async (req, res) => {
  const { email } = req.body;

  try {
    // 1. Generate the Code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 2. Configure Brevo API (Replaces Nodemailer)
    const apiInstance = new Brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(
      Brevo.TransactionalEmailsApiApiKeys.apiKey, 
      process.env.BREVO_API_KEY
    );

    const sendSmtpEmail = new Brevo.SendSmtpEmail();
    sendSmtpEmail.subject = "Verify your email address";
    sendSmtpEmail.htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee;">
        <h2 style="color: #333;">Wordlink Verification</h2>
        <p>Your verification code is:</p>
        <h1 style="color: #007bff; letter-spacing: 5px;">${otpCode}</h1>
        <p>This code will expire in 10 minutes.</p>
      </div>`;
    sendSmtpEmail.sender = { "name": "Wordlink", "email": process.env.EMAIL_USER };
    sendSmtpEmail.to = [{ "email": email }];

    // 3. Send via API call
    await apiInstance.sendTransacEmail(sendSmtpEmail);

    // 4. Update Database
    await Otp.findOneAndUpdate(
      { email },
      { $set: { otp: otpCode, expiresAt: Date.now() + 600000 } }, // 10 minutes
      { upsert: true, new: true }
    );

    return res.json({ success: true, message: "Verification mail sent successfully" });

  } catch (err) {
    console.error("Brevo API Error:", err);
    return res.status(500).json({ 
      success: false, 
      message: "Could not send email. Please check your Brevo API key and Sender email." 
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstname, lastname, username, email, phone, bio } = req.body;
    const imageFile = req.file;

    let profilePic = null;
    if (imageFile) {
      const result = await cloudinary.uploader.upload(imageFile.path, { folder: "wordlink_profiles" });
      profilePic = result.secure_url;
    }

    const updateFields = {
      firstname,
      lastname, 
      username,
      email,
      phone,
      bio
    };
    
    if (profilePic) {
      updateFields.profilePic = profilePic;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateFields, { new: true });
    
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "Profile updated successfully", user: updatedUser });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
  const { usernameOrEmail, password } = req.body;
  try {
    const user = await User.findOne({
      $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
    });
    
    if (user) {
      const confirmPassword = await bcrypt.compare(password, user.passwordHashed);

      if (confirmPassword) {
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
        return res.json({ token });
      }
    }
    return res.status(401).json({ message: "Invalid Credentials" });
  } catch (err) {
    return res.status(500).json({ message: "Login error" });
}
}