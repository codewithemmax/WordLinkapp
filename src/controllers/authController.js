import User from "../models/UserModel.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// Get all posts
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const userProfile = await User.findById(userId)
    return res.json(userProfile)
  }catch(err){
    return res.status(404).json({message: "Error getting profilr"})
  }
}

export const signUp = async (req, res) => {
  const { username, firstname, lastname, email, password } = req.body;
  const userN = await User.findOne({ username: username });
  const userE = await User.findOne({ email: email });
  if (userN) {
    return res.status(404).json({ message: "Useename has already been taken" });
  } else if (userE) {
    return res
      .status(404)
      .json({ message: "Email has already been registered" });
  }

  const passwordHashed = await bcrypt.hash(password, 10);
  const user = User({ firstname, lastname, username, email, passwordHashed });
  await user.save();
  res.json({ message: "Successful created an account " });
  console.log("Successfully created ");
};

export const logIn = async (req, res) => {
  const { usernameOrEmail, password } = req.body;
  const user = await User.findOne({
    $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
  });
  if (user) {
    const confirmPassword = await bcrypt.compare(password, user.passwordHashed);

    if (confirmPassword) {
      console.log("Successfully Log in");
      // after verifying password:
      const token = jwt.sign(
        {
          id: user._id,
          username: user.username,
          fullname: `${user.firstname} ${user.lastname}`,
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
