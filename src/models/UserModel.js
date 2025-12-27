import mongoose, { mongo } from "mongoose";
const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    firstname: { type: String, required: true },
    profilePic: { type: String, default: null },
    lastname: { type: String, required: true },
    phone: { type: String, default: "" },
  bio: { type: String, default: "" },
  email: { type: String, required: true },
    passwordHashed: { type: String, required: true },
    followers: {type: [mongoose.Schema.Types.ObjectId], default: []},
    followings: {type: [mongoose.Schema.Types.ObjectId], default: []},
    bookmarks: {type: [mongoose.Schema.Types.ObjectId], default: []},
    retweets: {type: [mongoose.Schema.Types.ObjectId], default: []}
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
