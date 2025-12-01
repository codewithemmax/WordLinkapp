import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
  username: String,
  fullname: String,
  content: String,
  imageUrl: String,
  createdAt: Date,
  isLiked: Boolean,
  profilePic: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User"},
  likes: { type: Number, default: 0 },
  likedBy: { type: [mongoose.Schema.Types.ObjectId], ref: "User", default: [] },
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
}, { timestamps: true });
export default mongoose.model("Post", postSchema);