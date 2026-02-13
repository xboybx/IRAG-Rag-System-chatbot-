const ConversationModel = require("../models/ConverstionModel.js");
const MessageModel = require("../models/MessageModel.js");


const getChatContext = async (conversationId, userId) => {
    try {

        const conversation = await ConversationModel.findById({
            _id: conversationId,
            user_id: userId
        });

        if (!conversation) {
            return {
                message: "Conversation not found"
            }
        }

        const messages = await MessageModel.find({
            conversation_id: conversationId,
            user_id: userId
        }).sort({ createdAt: -1 }).limit(10);

        if (!messages) {
            return {
                message: "No messages found"
            }
        }

        //Creating a context array

        const contextMessages = messages.reverse().map((msg) => {
            return {
                role: msg.role,
                content: msg.content
            }
        });

        if (!contextMessages) {
            return {
                message: "No context messages found"
            }
        }


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