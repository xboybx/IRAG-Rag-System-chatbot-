const express = require("express");
const router = express.Router();
const UserController = require("../Controllers/UserController");
const AuthMiddleware = require("../Middleware/AuthMiddlware");

router.post("/register", UserController.User_Register);
router.post("/login", UserController.User_Login);
router.post("/logout", AuthMiddleware, UserController.User_Logout);
router.get("/me", AuthMiddleware, UserController.User_Me);
router.post("/refresh", UserController.User_Refresh);

module.exports = router;
