import Post from "../models/PostModel.js";
import fs from "fs";
import crypto from "crypto";
import { v2 as cloudinary } from 'cloudinary';
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET
});

export const getPosts = async (req, res) => {
  try {
    const userId = req.user?.id
    const posts = await Post.find();

    const formatted = posts.map(post => ({
      _id: post._id,
      username: post.username,
      fullname: post.fullname,
      content: post.content,
      imageUrl: post.imageUrl,
      likes: post.likes,
      comments: post.comments,
      createdAt: post.createdAt,
      isLiked: userId ? post.likedBy.includes(userId) : false // 👈 key part
    }));

    return res.json(formatted);
    if (userId){
    	console.log(post.likedBy)
    	console.log(userId)
    }
  } catch (err) {
    return res.status(500).json({ message: "Error fetching posts" });
  }
};
// Like a post
export const likePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id; // from auth middleware

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    // Initialize likedBy if missing (in case older posts don’t have it)
    if (!post.likedBy) post.likedBy = [];

    const alreadyLiked = post.likedBy.includes(userId);

    if (alreadyLiked) {
      // Unlike the post
      post.likedBy = post.likedBy.filter(id => id.toString() !== userId);
      post.likes = Math.max(0, post.likes - 1);
    } else {
      // Like the post
      post.likedBy.push(userId);
      post.likes += 1;
    }

    await post.save();

    return res.status(200).json({
      message: alreadyLiked ? "Unliked post" : "Liked post",
      likes: post.likes,
      isLiked: !alreadyLiked, // important for frontend toggle
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};
// Add a comment
export const commentPost = async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ message: "Post not found" });

  const { text } = req.body;
  post.comments.push({
    username: req.user.username,
    text,
    createdAt: new Date(),
  });
  await post.save();

  res.json({ message: "Comment added" });
};

// ✅ CREATE a new post
export const createPost = async (req, res) => {
  try {
    // content is sent from the frontend
    const { text } = req.body;
    const imageFile = req.file;
    
    // Validate
    
    let imageUrl = null;
    
    // Upload to Cloudinary if image exists
    if (imageFile) {
      console.log('Uploading to Cloudinary...');
      const timestamp = Math.floor(Date.now() / 1000);

      // Params to sign
      const signature = crypto
        .createHash("sha1")
        .update(
          `folder=wordlink_posts&timestamp=${timestamp}${process.env.CLOUD_API_SECRET}`
        )
        .digest("hex");

      const result = await cloudinary.uploader.upload(imageFile.path, {
        folder: "wordlink_posts",
        timestamp,
        signature,
        api_key: process.env.CLOUD_API_KEY
      });

      imageUrl = result.secure_url;

      fs.unlinkSync(imageFile.path)
      
      console.log('Upload successful:', imageUrl);
    }

    // Check if content is empty
    if (!text || text.trim() === "") {
      return res.status(400).json({ message: "Post content cannot be empty." });
    }

    // req.user is set by authenticateToken middleware
    const newPost = new Post({
      username: req.user.username, // comes from the decoded token
      content: text,
      imageUrl: imageUrl,
      fullname: req.user.fullname,
      createdAt: new Date(),
      likes: 0,
      comments: [],
    });

    await newPost.save();
    return res
      .status(201)
      .json({ message: "Post created successfully!", post: newPost });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error while creating post." });
  }
};

// Get single post
export const getPost = async (req, res) => {
  const post = await Post.findById(req.params.id);
  res.json(post);
};

// Delete post
export const deletePost = async (req, res) => {
  await Post.findByIdAndDelete(req.params.id);
  res.json({ message: "Post deleted" });
};

// Update post
export const updatePost = async (req, res) => {
  const post = await Post.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  res.json(post);
};
