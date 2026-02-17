const ConversationModel = require("../models/ConverstionModel.js");
const MessageModel = require("../models/MessageModel.js");
const EmbeddingModel = require("../models/EmbeddingModel.js");
const { getChatContext } = require("../utils/ChatContext.js");
const { generateResponse } = require("../services/ai.service.js");
const { performRagCheck } = require("../services/rag.service.js"); // Using RAG Service now
const { uploadFile } = require("../services/imagekit.service.js");
const { parseFile } = require("../utils/FileParser.js");
const FileModel = require("../models/FileModel.js");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const { generateEmbeddingForChunks } = require("../services/embedding.service.js");
const { performWebSearch, shouldAutoSearch } = require("../services/webSearch.service.js");




const chatController = async (req, res) => {
    try {
        let { conversationId, message, selectedModel, history, useRag, useWebSearch } = req.body;
        const CurrentUser = req.user.id;
        const isStreaming = true; // Force streaming for now

        if (!CurrentUser) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        if (!message || !selectedModel) {
            return res.status(400).json({ message: "Bad Request: Message and Model are required" });
        }

        // --- AUTO-CREATE CONVERSATION LOGIC ---
        // If conversationId is missing, create a new conversation automatically
        if (!conversationId) {
            console.log("\n--------------------\n[Auto-Create] No conversationId provided. Creating new conversation...\n--------------------\n");
            const newConversation = await ConversationModel.create({
                user_id: CurrentUser,
                title: message.substring(0, 30) + "...", // Use first 30 chars as title
            });

            if (newConversation) {
                conversationId = newConversation._id; // Update variable to use new ID
                console.log(`\n--------------------\n[Auto-Create] New Conversation Created: ${conversationId}\n--------------------\n`);
            } else {
                return res.status(500).json({ message: "Error creating new conversation" });
            }
        }
        // --------------------------------------

        /* Fetch existing conversation context */
        // OPTIMIZATION: Check if history is provided by the client to avoid DB lookup
        let contextMessages;
        if (history && Array.isArray(history)) {
            // Validate and sanitize client-provided history
            contextMessages = history.map(msg => ({
                role: msg.role,
                content: msg.content
            }));
            console.log("\n--------------------\n[Controller] Using client-provided chat history using the Chat History from frontend to genrate the Context Messages Array.\n--------------------\n");
        } else {
            // Fallback to database fetch
            const dbContext = await getChatContext(conversationId, CurrentUser);
            if (dbContext.error) {
                return res.status(500).json({
                    message: "Error in getChatContext",
                    error: dbContext.error
                });
            }
            contextMessages = dbContext;
        }



        // --- WEB SEARCH LOGIC ---
        // Check if manual (true) or auto ("auto" + keyword match)
        // Ensure strictly boolean or "auto" string.
        const isManualSearch = useWebSearch === true;
        const isAutoSearch = useWebSearch === "auto" && shouldAutoSearch(message);

        if (isManualSearch || isAutoSearch) {
            console.log(`[Controller] Web Search Triggered: Manual=${isManualSearch}, Auto=${isAutoSearch}`);
            const webContext = await performWebSearch(message);
            if (webContext) {
                // Inject search results as a SYSTEM message so the AI "knows" it
                contextMessages.push({
                    role: "system",
                    content: `Current Web Search Context:\n${webContext}`
                });
                console.log("\n--------------------\n[Controller] Injected Web Search Context sent the tavily seach result response to the AI Through message context.\n--------------------\n");
            }
        }



        // --- RAG CHECK (Using Service) ---
        // Only run RAG if client enables it (or defaults to true)
        const shouldRunRag = useRag !== false;
        if (shouldRunRag) {
            const ragContext = await performRagCheck(conversationId, message);
            if (ragContext) {
                // Inject context as a system message
                contextMessages.push({
                    role: "system",
                    content: ragContext
                });
                console.log("\n--------------------\n[Controller] Injected RAG Context rag is used here that is ligiht similatity search to find wherater to use Rag or not based on user Input.\n--------------------\n");
            }
        }
        // --------------------------------

        // Only NOW append the User's latest message (so context is *before* the question)
        contextMessages.push({
            role: "user",
            content: message
        });

        // 1. Save User Message (Async, wait for it)
        const saveUserMessagePromise = await MessageModel.create({
            user_id: CurrentUser,
            conversation_id: conversationId,
            role: "user",
            content: message
        });


        // Log the context messages for debugging
        console.log("\n--------------------\n[Controller] Context Messages sent to AI:\n--------------------\n", JSON.stringify(contextMessages, null, 2), "\n--------------------\n");


        // --- STREAMING OR NORMAL RESPONSE ---
        if (isStreaming) {
            // Set Headers for Streaming
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.setHeader('Transfer-Encoding', 'chunked');

            // Optionally send the Conversation ID as a metadata header or first chunk
            // Ideally we'd use SSE (text/event-stream) for structured data, but plain text is easier for "typewriter"
            // We can send the ID in a header for the frontend to read if needed.
            res.setHeader('x-conversation-id', conversationId);

            const stream = await generateResponse(contextMessages, selectedModel, true);

            if (stream.error) {
                return res.status(500).json(stream);
            }

            let fullAiResponse = "";

            try {
                for await (const chunk of stream) {
                    const content = chunk.choices[0]?.delta?.content || "";
                    if (content) {
                        res.write(content);
                        fullAiResponse += content;
                    }
                }
            } catch (streamError) {
                console.error("Stream Error:", streamError);
                res.write("\n[Error: Stream interrupted]");
            } finally {
                res.end(); // End the stream

                // Save full response to DB
                if (fullAiResponse) {
                    await MessageModel.create({
                        user_id: CurrentUser,
                        conversation_id: conversationId,
                        role: "assistant", // Using 'assistant' to match MessageModel enum
                        content: fullAiResponse
                    });
                    console.log("[Controller] Saved full AI response to DB.");
                }
            }

        } else {
            // NORMAL (Non-Streaming) logic
            const aiResponse = await generateResponse(contextMessages, selectedModel, false);

            if (aiResponse.error) {
                return res.status(500).json({
                    message: "Error in generateResponse",
                    error: aiResponse.error
                });
            }

            // Save AI response in database
            const saveAIMessage = await MessageModel.create({
                user_id: CurrentUser,
                conversation_id: conversationId,
                role: "assistant",
                content: aiResponse.content
            });

            return res.status(200).json({
                message: "Success",
                conversationId: conversationId,
                data: aiResponse
            });
        }

    } catch (error) {
        console.error("ChatController Error:", error);
        // If headers sent, we can't send JSON error
        if (res.headersSent) {
            res.end();
        } else {
            return res.status(500).json({
                message: "Error ChatController",
                error: error.message
            });
        }
    }
};

//Create Conversation Manually
const CreateConversationController = async (req, res) => {
    try {
        const { title } = req.body;

        if (!title) {
            return res.status(400).json({
                message: "Title is required",
                error: "Title is required"
            });
        }

        const conversation = await ConversationModel.create({
            title,
            user_id: req.user.id
        });

        if (!conversation) {
            return res.status(500).json({
                message: "Error in CreateConversationController",
                error: "Failed to create conversation"
            });
        }

        return res.status(200).json({
            message: "Success",
            data: conversation
        });
    } catch (error) {
        return res.status(500).json({
            message: "Error CreateConversationController",
            error: error.message
        });
    }
};

const DatasetUploadController = async (req, res) => {
    try {
        const file = req.file; //it is provided by multer after processing the file

        if (!file) {
            return res.status(400).json({
                message: "File is required",
                error: "File is required"
            });
        }

        // 1. Upload to ImageKit
        //The file we uploaded is rn present in array as buffer for chunking and we need to store that file in imagekit
        console.log(`[Upload] Uploading ${file.originalname} to ImageKit...`);
        const uploadedFile = await uploadFile(file);

        if (!uploadedFile) {
            return res.status(500).json({
                message: "Error in uploadFile",
                error: "Failed to upload file"
            });
        }
        console.log(`\n--------------------\n[Upload] File uploaded successfully: ${uploadedFile.url} \n--------------------\n`);


        //save the file to DB
        const newFile = await FileModel.create({
            originalName: file.originalname,
            storagePath: uploadedFile.url,
            mimeType: file.mimetype,
            size: file.size,
            uploadedBy: req.user.id,
            conversationId: req.body.conversationId
        });

        if (!newFile) {
            return res.status(500).json({
                message: "Error in newFile",
                error: "Failed to save file"
            });
        }

        // Add file to Conversation
        await ConversationModel.findByIdAndUpdate({
            _id: req.body.conversationId
        }, {
            $push: { files: newFile._id }
        })


        //3.parse the extracted text
        console.log(`\n--------------------\n[Process] Parsing text...\n--------------------\n`);
        const extractedText = await parseFile(file.buffer, file.mimetype);
        console.log(`\n--------------------\n[Process] Text parsed successfully\n--------------------\n`);

        //4.split into Chunks
        const splitText = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200
        });

        const chunks = await splitText.createDocuments([extractedText]);
        console.log(`[Process] Text split into ${chunks.length} chunks`);
        //we get chunks array with the text and we loop through the array to creat embeds fo each item


        //5.create embeddings
        const embeddingVector = await generateEmbeddingForChunks(chunks, newFile._id, req.body.conversationId);

        //6.save to DB
        await EmbeddingModel.insertMany(embeddingVector);
        console.log(`\n--------------------\n[Process] Embeddings saved to DB\n--------------------\n`);

        return res.status(200).json({
            message: "File processed successfully",
            file: newFile
        });


    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({ message: "Processing failed", error: error.message });
    }
}

// Get Conversations History
const getConversationsController = async (req, res) => {
    try {
        const userId = req.user.id;
        const conversations = await ConversationModel.find({ user_id: req.user.id })
            .sort({ createdAt: -1 })
            .select("title createdAt updatedAt"); // Select only necessary fields

        return res.status(200).json({
            message: "Success",
            data: conversations
        });
    } catch (error) {
        return res.status(500).json({
            message: "Error getConversationsController",
            error: error.message
        });
    }
};

// Delete Conversation
const deleteConversationController = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.id;

        if (!conversationId) {
            return res.status(400).json({ message: "Conversation ID is required" });
        }


        const conversation = await ConversationModel.findOneAndDelete({
            _id: conversationId,
            user_id: userId
        });

        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found or unauthorized" });
        }

        // Also delete messages associated with this conversation
        await MessageModel.deleteMany({ conversation_id: conversationId });

        return res.status(200).json({
            message: "Conversation deleted successfully",
            conversationId: conversationId
        });
    } catch (error) {
        return res.status(500).json({
            message: "Error deleteConversationController",
            error: error.message
        });
    }
};


// Get Messages for a Conversation
const getMessagesController = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.id;

        // Verify conversation belongs to user
        const conversation = await ConversationModel.findOne({
            _id: conversationId,
            user_id: userId
        });

        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found or unauthorized" });
        }

        const messages = await MessageModel.find({ conversation_id: conversationId })
            .sort({ createdAt: 1 }); // Oldest first

        return res.status(200).json({
            message: "Success",
            data: messages
        });
    } catch (error) {
        return res.status(500).json({
            message: "Error getMessagesController",
            error: error.message
        });
    }
};

module.exports = {
    chatController,
    CreateConversationController,
    DatasetUploadController,
    getConversationsController,
    deleteConversationController,
    getMessagesController

};
