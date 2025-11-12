import Post from "../models/PostModel.js";
export const getPosts = async (req, res) => {
  try {
    console.log("Get post")
    const userId = req.user?.id
    const posts = await Post.find();

    const formatted = posts.map(post => ({
      _id: post._id,
      username: post.username,
      fullname: post.fullname,
      content: post.content,
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

    res.status(200).json({
      message: alreadyLiked ? "Unliked post" : "Liked post",
      likes: post.likes,
      isLiked: !alreadyLiked, // important for frontend toggle
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
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
    const { content } = req.body;

    // Check if content is empty
    if (!content || content.trim() === "") {
      return res.status(400).json({ message: "Post content cannot be empty." });
    }

    // req.user is set by authenticateToken middleware
    const newPost = new Post({
      username: req.user.username, // comes from the decoded token
      content: content,
      fullname: req.user.fullname,
      createdAt: new Date(),
      likes: 0,
      comments: [],
    });

    await newPost.save();
    res
      .status(201)
      .json({ message: "Post created successfully!", post: newPost });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error while creating post." });
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
