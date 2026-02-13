const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    conversation_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Conversation",
        required: true
    },
    content: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ["user", "assistant", "system"],
        required: true
    },

    // --- RAG Specific Fields ---

    /**
     * The actual query sent to the vector database.
     * Use Case: If a user asks "How much?", we might rewrite it to "price of premium plan" 
     * before searching. Storing this helps debug why we found certain results.
     */
    rewrittenQuery: String,

    /**
     * The sources used to generate this answer.
     * Use Case: Displaying "Reference [1]" links in the UI so users can verify facts.
     */
    //These are useful for ai , to show from where i got the answer from like wich file ,wich embedding etc
    citations: [{
        sourceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Embedding"
        },
        // Type of source: 'file' (your vector db) or 'web' (Tavily/Google)
        type: { type: String, enum: ['file', 'web'], default: 'file' },

        fileId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'File' // Points to the whole document (for display name)
        },

        // The specific text chunk we found in the document
        text: String,
        // Which page or section this chunk came from
        pageNumber: Number,
        // How closely this chunk matched the query (0.0 - 1.0)
        score: Number
    }],

    /**
     * User's reaction to the answer.
     * Use Case: RLHF (Reinforcement Learning from Human Feedback). 
     * You can use this to retrain your retrieval system.
     */
    userFeedback: {
        type: String,
        enum: ["thumbsUp", "thumbsDown", "neutral"],
        default: "neutral"
    },

    /**
     * Cost tracking.
     * Use Case: knowing that a message cost $0.02 because 
     * we retrieved 10 large chunks and added them to the prompt.
     */
    tokens: {
        input: Number,  // Tokens in user prompt + retrieved context
        output: Number  // Tokens in AI response
    }


}, { timestamps: true });

const MessageModel = mongoose.model("Message", messageSchema);
module.exports = MessageModel;



