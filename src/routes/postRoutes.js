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

const router = express.Router();

router.get("/", optionalAuthenticateToken, getPosts);
router.post("/", authenticateToken, createPost);
router.get("/:id", getPost);
router.put("/:id", updatePost);
router.delete("/:id", deletePost);
router.post("/:id/like", authenticateToken, likePost);
router.post("/:id/comment", authenticateToken, commentPost);

export default router;
