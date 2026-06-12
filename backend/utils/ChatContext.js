const ConversationModel = require("../models/ConverstionModel.js");
const MessageModel = require("../models/MessageModel.js");


const getChatContext = async (conversationId, userId) => {
    try {

        const conversation = await ConversationModel.findOne({
            _id: conversationId,
            user_id: userId
        });

        if (!conversation) {
            return [];
        }

        const messages = await MessageModel.find({
            conversation_id: conversationId,
            user_id: userId
        }).sort({ createdAt: -1 }).limit(10);

        if (!messages || messages.length === 0) {
            return [];
        }

        //Creating a context array

        const contextMessages = messages.reverse().map((msg) => {
            return {
                role: msg.role,
                content: msg.content
            }
        });

        return contextMessages;

    } catch (err) {
        return {
            message: "Error in getChatContext",
            error: err.message
        }
    }
}

module.exports = {
    getChatContext
}