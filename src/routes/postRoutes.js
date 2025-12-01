import express from "express";
import {
  getPosts,
  createPost,
  getPost,
  deletePost,
  updatePost,
  likePost,
  commentPost
} from "../controllers/postController.js";
import { optionalAuthenticateToken, authenticateToken } from "../middleware/authMiddleware.js";
import multer from 'multer'

const router = express.Router();
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 }  // 5MB max
});
router.get("/", optionalAuthenticateToken, getPosts);
router.post("/", authenticateToken, upload.single('image'), createPost);
router.get("/:id", getPost);
router.put("/:id", updatePost);
router.delete("/:id", authenticateToken, deletePost);
router.post("/:id/like", authenticateToken, likePost);
router.post("/:id/comment", authenticateToken, commentPost);

export default router;
