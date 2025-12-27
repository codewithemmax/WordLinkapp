import Post from "../models/PostModel.js";
import User from "../models/UserModel.js";
import Notification from "../models/NotificationModel.js";
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
      user: req.user.id,
      content: text,
      imageUrl: imageUrl,
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
    const posts = await Post.find().populate('user', 'username firstname lastname profilePic');
    
    let currentUser = null;
    if (userId) {
      currentUser = await User.findById(userId);
    }

    const formatted = posts.map(post => ({
      _id: post._id,
      userId: post.user._id,
      username: post.user.username,
      fullname: `${post.user.firstname} ${post.user.lastname}`,
      profilePic: post.user.profilePic,
      content: post.content,
      imageUrl: post.imageUrl,
      likes: post.likes,
      comments: post.comments,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      isUserPost: post.user._id.toString() === userId,
      isLiked: userId ? post.likedBy.includes(userId) : false,
      isFollowing: currentUser ? currentUser.followings.includes(post.user._id) : false
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
    postedBy: req.user.id,
    text,
    createdAt: new Date(),
  });
  await post.save();

  res.json({ message: "Comment added" });
};

export const replyToComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const { text } = req.body; // The reply text
    const userId = req.user.id; // Assuming you have user ID from middleware

    // 1. Find the Post
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    // 2. Find the specific Comment inside the post
    const comment = post.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    // 3. Add the Reply to the 'replies' array
    const newReply = {
      userId,
      text,
      createdAt: new Date()
    };

    comment.replies.push(newReply);

    // 4. Save the parent Post
    await post.save();

    // 5. Populate user details to send back to frontend immediately
    // Note: We only populate the NEW reply for efficiency, or you can re-fetch the whole post
    const populatedPost = await Post.findById(postId).populate({
        path: 'comments.replies.userId',
        select: 'username fullname profilePic'
    });
    
    // Find the comment again to return just the updated thread
    const updatedComment = populatedPost.comments.id(commentId);

    return res.status(201).json({ message: "Reply added", replies: updatedComment.replies });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Get single post
// Get single post with populated comments
export const getPost = async (req, res) => {
  try {
    const userId = req.user?.id;

    // 1. Fetch the post and Populate user details
    const post = await Post.findById(req.params.id)
      .populate({
        path: "comments.postedBy",
        select: "username firstname lastname profilePic"
      })
      .populate({
        path: "comments.replies.userId",
        select: "username firstname lastname profilePic"
      })
      .populate('user', 'username firstname lastname profilePic');

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // 2. Map through comments to rename 'postedBy' -> 'userId'
    // This fixes the issue where frontend expects 'userId' but DB has 'postedBy'
    const formattedComments = post.comments.map(comment => {
      return {
        _id: comment._id,
        text: comment.text,
        createdAt: comment.createdAt,
        replies: comment.replies, // Replies already use 'userId', so they are fine
        
        // THE FIX: Send 'postedBy' data as 'userId'
        userId: comment.postedBy 
      };
    });

    // 3. Format the final response
    const formatted = {
      _id: post._id,
      username: post.user.username,
      fullname: `${post.user.firstname} ${post.user.lastname}`,
      content: post.content,
      imageUrl: post.imageUrl,
      likes: post.likes,
      comments: formattedComments, // Use our fixed comments array
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      isUserPost: post.user._id.toString() === userId,
      profilePic: post.user.profilePic,
      isLiked: userId ? post.likedBy.includes(userId) : false
    };

    res.json(formatted);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error fetching post" });
  }
};
// Delete post
export const deletePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.user._id.toString() !== userId) {
      return res.status(403).json({ message: "Not authorized to delete this post" });
    }

    await Post.findByIdAndDelete(postId);
    res.json({ message: "Post deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
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

// Bookmark post
export const bookmarkPost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isBookmarked = user.bookmarks.includes(postId);

    if (isBookmarked) {
      user.bookmarks = user.bookmarks.filter(id => id.toString() !== postId);
    } else {
      user.bookmarks.push(postId);
    }

    await user.save();
    res.json({ message: isBookmarked ? "Removed from bookmarks" : "Added to bookmarks" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Retweet post
export const retweetPost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isRetweeted = user.retweets.includes(postId);

    if (!isRetweeted) {
      user.retweets.push(postId);
      await user.save();
    }

    res.json({ message: "Post retweeted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Follow user
export const followUser = async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    const currentUserId = req.user.id;

    if (targetUserId === currentUserId) {
      return res.status(400).json({ message: "Cannot follow yourself" });
    }

    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) return res.status(404).json({ message: "User not found" });

    const isFollowing = currentUser.followings.includes(targetUserId);

    if (isFollowing) {
      currentUser.followings = currentUser.followings.filter(id => id.toString() !== targetUserId);
      targetUser.followers = targetUser.followers.filter(id => id.toString() !== currentUserId);
    } else {
      currentUser.followings.push(targetUserId);
      targetUser.followers.push(currentUserId);
      
      // Create notification
      await Notification.create({
        userId: targetUserId,
        type: 'follow',
        fromUserId: currentUserId,
        message: `${currentUser.username} started following you`
      });
    }

    await currentUser.save();
    await targetUser.save();

    res.json({ message: isFollowing ? "Unfollowed user" : "Followed user", isFollowing: !isFollowing });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

