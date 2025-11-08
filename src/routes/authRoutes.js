import express from "express";
import { logIn, signUp } from "../controllers/authController.js";

const app = express.Router();

app.post("/signup", signUp);
app.post("/login", logIn);

export default app;
