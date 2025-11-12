import mongoose, { mongo } from "mongoose";
const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    firstname: { type: String, required: true },
    lastname: { type: String, required: true },
    email: { type: String, required: true },
    passwordHashed: { type: String, required: true },
    followers: {type: [mongoose.Schema.Types.ObjectId], default: []},
    followings: {type: [mongoose.Schema.Types.ObjectId], default: []}
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
