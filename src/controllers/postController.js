// ...existing code...
import Post from "../models/PostModel.js";
import fs from "fs";
import { v2 as cloudinary } from 'cloudinary';
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET
});
if (!process.env.CLOUD_NAME || !process.env.CLOUD_API_KEY || !process.env.CLOUD_API_SECRET) {
  console.error('Cloudinary env vars missing: ensure CLOUD_NAME, CLOUD_API_KEY, CLOUD_API_SECRET are set');
}
// ...existing code...

// inside createPost — replace the image upload block with the following:
export const createPost = async (req, res) => {
  try {
    // content is sent from the frontend
    const { text } = req.body;
    const imageFile = req.file;
    
    // Validate
    
    let imageUrl = null;
    
    // Upload to Cloudinary if image exists
    if (imageFile) {
      const uploadWithTimeout = (filePath, timeoutMs = 60000) => {
        return new Promise((resolve, reject) => {
          const uploadPromise = cloudinary.uploader.upload(filePath, { folder: "wordlink_posts" });
          const to = setTimeout(() => {
            reject(new Error('Cloudinary upload timed out'));
          }, timeoutMs);

          uploadPromise
            .then((r) => { clearTimeout(to); resolve(r); })
            .catch((e) => { clearTimeout(to); reject(e); });
        });
      };

      // retry logic
      const maxRetries = 3;
      let attempt = 0;
      let lastError = null;
      try {
        while (attempt < maxRetries) {
          attempt++;
          try {
            const result = await uploadWithTimeout(imageFile.path, 60000); // 60s per attempt
            imageUrl = result.secure_url;
            break;
          } catch (err) {
            lastError = err;
            console.warn(`Upload attempt ${attempt} failed:`, err.message || err);
            if (attempt < maxRetries) {
              // exponential backoff
              await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
            }
          }
        }
      } finally {
        // always clean up temp file
        if (fs.existsSync(imageFile.path)) {
          try { fs.unlinkSync(imageFile.path); } catch (e) { console.warn('Failed to remove temp file', e); }
        }
      }
    }


    // Check if content is empty
    if (!text || text.trim() === "") {
      return res.status(400).json({ message: "Post content cannot be empty." });
    }

    // req.user is set by authenticateToken middleware
    const newPost = new Post({
      username: req.user.username, // comes from the decoded token
      content: text,
      userId: req.user.id,
      imageUrl: imageUrl,
      profilePic: req.user.profilePic,
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
// ...existing code...

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
      updatedAt: post.updatedAt,
      isUserPost: post.userId ? post.userId.toString() === userId : false,
      profilePic: post.profilePic,
      isLiked: userId ? post.likedBy.includes(userId) : false // 👈 key part
    }));

    return res.json(formatted);
  } catch (err) {
    return res.status(500).json({ message: `Error fetching posts: ${err}` });
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

// Get single post
export const getPost = async (req, res) => {
  const post = await Post.findById(req.params.id);
  const userId = req.user?.id
  const formatted = {
      _id: post._id,
      username: post.username,
      fullname: post.fullname,
      content: post.content,
      imageUrl: post.imageUrl,
      likes: post.likes,
      comments: post.comments,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      isUserPost: post.userId ? post.userId.toString() === userId : false,
      profilePic: post.profilePic,
      isLiked: userId ? post.likedBy.includes(userId) : false // 👈 key part
    };
  res.json(formatted);
};

// Delete post
export const deletePost = async (req, res) => {
  await Post.findByIdAndDelete(req.params.id);
  res.json({ message: "Post deleted" });
};

// Update post
export const updatePost = async (req, res) => {
  try {
    const { text } = req.body;
    const imageFile = req.file;

    if (!text || text.trim() === "") {
      return res.status(400).json({ message: "Post content cannot be empty." });
    }

    let imageUrl = null;

    if (imageFile) {
      const uploadWithTimeout = (filePath, timeoutMs = 60000) => {
        return new Promise((resolve, reject) => {
          const uploadPromise = cloudinary.uploader.upload(filePath, { folder: "wordlink_posts" });
          const to = setTimeout(() => reject(new Error('Cloudinary upload timed out')), timeoutMs);

          uploadPromise
            .then((r) => { clearTimeout(to); resolve(r); })
            .catch((e) => { clearTimeout(to); reject(e); });
        });
      };

      const maxRetries = 3;
      let attempt = 0;
      let lastError = null;

      while (attempt < maxRetries) {
        attempt++;
        try {
          const result = await uploadWithTimeout(imageFile.path);
          imageUrl = result.secure_url;
          break;
        } catch (err) {
          lastError = err;
          console.warn(`Upload attempt ${attempt} failed:`, err.message || err);
          if (attempt < maxRetries) {
            await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
          }
        }
      }

      // always clean up temp file
      if (fs.existsSync(imageFile.path)) {
        try { fs.unlinkSync(imageFile.path); } catch (e) { console.warn('Failed to remove temp file', e); }
      }

      if (!imageUrl && lastError) {
        return res.status(500).json({ message: "Failed to upload image.", error: lastError.message });
      }
    }

    // Build update object
    const updateFields = {
      content: text,
    };
    if (imageUrl){
      updateFields.imageUrl = imageUrl;
    }else{
      updateFields.imageUrl = null; // to remove existing image
    }

    const post = await Post.findByIdAndUpdate(req.params.id, updateFields, { new: true });

    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }

    return res.status(200).json({ message: "Post updated successfully!", post });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error while updating post." });
  }
};

