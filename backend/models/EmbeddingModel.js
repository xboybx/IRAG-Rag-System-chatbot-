const mongoose = require("mongoose");

const embeddingSchema = new mongoose.Schema({
    // Link back to the original file
    fileId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "File",
        required: true,
        index: true // Delete chunks easily when a file is deleted
    },

    // The actual text chunk used for context
    text: {
        type: String,
        required: true
    },

    // The vector embedding (e.g., 1536 dimensions for OpenAI text-embedding-3-small)
    // In MongoDB Atlas, you must configure a Vector Search Index on this field!
    embedding: {
        type: [Number],
        required: true
    },

    // Metadata helps the AI know "where" in the file this is
    metadata: {
        pageNumber: Number,
        chunkIndex: Number, // Chunk 1, Chunk 2, ...
    }
}, { timestamps: true });

const Embedding = mongoose.model("Embedding", embeddingSchema);
module.exports = Embedding;
