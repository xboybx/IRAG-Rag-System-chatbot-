const express = require("express");
const router = express.Router();
const AuthMiddleware = require("../Middleware/AuthMiddlware");
const AIController = require("../Controllers/AIcontroller");
const upload = require("../Middleware/multer.middleware");

router.post("/chat/:ConversationId", AuthMiddleware, AIController.chatController)
router.post("/create-conversation", AuthMiddleware, AIController.CreateConversationController)
router.post("/dataset-upload", AuthMiddleware, upload.single("file"), AIController.DatasetUploadController)

module.exports = router;