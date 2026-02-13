const mongoose = require("mongoose");


const conversationSchema = new mongoose.Schema({

    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",//The id is from the users collection
        required: true
    },
    title: {
        type: String,
        default: "New Conversation"

    },

    //To have model for each converstion if needed
    model: {
        type: String,
        default: "gpt-4-turbo"
    },

    //To have isArchived for each converstion
    isArchived: {
        type: Boolean,
        default: false
    },

    //To have system prompt for each specific converstion if needed 
    //that means if there is SP ,for every message in that particular conversation SP will be added
    systemInstruction: {
        type: String,
        default: ""
    },

    //To have last message for each converstion
    lastMessage: {
        type: String,
        default: Date.now()
    },
    files: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: "File" //The id is from the files collection
    }








}, { timestamps: true });


const ConversationModel = mongoose.model("Conversation", conversationSchema);

module.exports = ConversationModel;
