import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
	  username: String,
	  fullname: String,
	  content: String,
      createdAt: Date,
      likes: { type: Number, default: 0 },
      likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  }, { timestamps: true }); // ✅ only this closing parenthesis

 export default mongoose.model("Post", postSchema);
