const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
    originalName: {
        type: String,
        required: true
    },
    // Where is the file actually stored? (S3 URL, Cloudinary, or local path)
    storagePath: {
        type: String,
        required: true
    },
    mimeType: String,
    size: Number,

    // Who uploaded it?
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    size: {
        type: Number,
        required: true
    },

    // Which conversation does this belong to?
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Conversation",
        required: true
    }
}, { timestamps: true });

const File = mongoose.model("File", fileSchema);
module.exports = File;
