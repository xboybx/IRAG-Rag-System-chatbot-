const ConversationModel = require("../models/ConverstionModel.js");
const MessageModel = require("../models/MessageModel.js");
const EmbeddingModel = require("../models/EmbeddingModel.js");
const { getChatContext } = require("../utils/ChatContext.js");
const { generateResponse } = require("../services/ai.service.js");
const { performRagCheck } = require("../services/rag.service.js"); // Using RAG Service now
const { uploadFile } = require("../services/imageKit.service.js");
const { parseFile } = require("../utils/FileParser.js");
const FileModel = require("../models/FileModel.js");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const { generateEmbeddingForChunks } = require("../services/embedding.service.js");
const { performWebSearch, shouldAutoSearch } = require("../services/webSearch.service.js");




const chatController = async (req, res) => {
    try {
        let { conversationId, message, selectedModel, history, useRag, useWebSearch } = req.body;
        const CurrentUser = req.user.id;

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
        if (useWebSearch === true || (useWebSearch === "auto" && shouldAutoSearch(message))) {
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

        // --- PARALLEL EXECUTION ---
        // 1. Save User Message (Async, but we wait for it to ensure data integrity)
        const saveUserMessagePromise = MessageModel.create({
            user_id: CurrentUser,
            conversation_id: conversationId,
            role: "user",
            content: message
        });

        // 2. Generate AI Response
        const generateResponsePromise = generateResponse(contextMessages, selectedModel);

        const [saveUserMessage, aiResponse] = await Promise.all([saveUserMessagePromise, generateResponsePromise]);


        if (!saveUserMessage) {
            return res.status(500).json({
                message: "Error in saveUserMessage",
                error: "Failed to save user message to DB"
            });
        }

        // Log the context messages for debugging
        console.log("\n--------------------\n[Controller] Context Messages sent to AI:\n--------------------\n", JSON.stringify(contextMessages, null, 2), "\n--------------------\n");


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
            content: aiResponse.content // Extract content
        });

        if (!saveAIMessage) {
            return res.status(500).json({
                message: "Error in saveAIMessage",
                error: "Failed to save AI message to DB"
            });
        }

        return res.status(200).json({
            message: "Success",
            conversationId: conversationId, // Return ID so frontend can update URL
            data: aiResponse
        });

    } catch (error) {
        console.error("ChatController Error:", error);
        return res.status(500).json({
            message: "Error ChatController",
            error: error.message
        });
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


module.exports = {
    chatController,
    CreateConversationController,
    DatasetUploadController
};
