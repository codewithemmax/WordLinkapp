import mongoose from "mongoose";

const replySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
});

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
  comments: [{ postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
               text: { type: String, required: true },
               createdAt: { type: Date, default: Date.now },
               likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
              // ADD THIS: The Thread
              replies: [replySchema]
  }
]
}, { timestamps: true });
export default mongoose.model("Post", postSchema);