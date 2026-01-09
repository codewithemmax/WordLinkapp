const express = require('express');
const {
  getPosts,
  createPost,
  getPost,
  deletePost,
  updatePost,
  likePost,
  commentPost,
  bookmarkPost,
  retweetPost,
  followUser
} = require('../controllers/postController.js');
const { optionalAuthenticateToken, authenticateToken } = require('../middleware/authMiddleware.js');
const multer = require('multer');

const router = express.Router();
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 }
});
router.get("/", optionalAuthenticateToken, getPosts);
router.post("/", authenticateToken, upload.single('image'), createPost);
router.get("/:id", authenticateToken, getPost);
router.put("/:id", authenticateToken, upload.single('image'), updatePost);
router.delete("/:id", authenticateToken, deletePost);
router.post("/:id/like", authenticateToken, likePost);
router.post("/:id/comment", authenticateToken, commentPost);
router.post("/:id/bookmark", authenticateToken, bookmarkPost);
router.post("/:id/retweet", authenticateToken, retweetPost);
router.post("/follow/:userId", authenticateToken, followUser);

module.exports = router;
