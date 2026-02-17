const ConversationModel = require("../models/ConverstionModel.js");
const EmbeddingModel = require("../models/EmbeddingModel.js");
const { generateEmbedding } = require("./embedding.service.js");

/**
 * Performs RAG (Retrieval Augmented Generation) logic.
 * Checks if a conversation has associated files, and if so,
 * searches for relevant context using vector similarity.
 * 
 * @param {string} conversationId - The ID of the current conversation
 * @param {string} userMessage - The user's query text
 * @returns {Promise<string|null>} - Returns the context string to inject, or null if no context found/needed
 */
const performRagCheck = async (conversationId, userMessage) => {
    try {
        // 1. Check for files in conversation
        const conversation = await ConversationModel.findById(conversationId);

        if (!conversation || !conversation.files || conversation.files.length === 0) {
            return null; // No files, no RAG needed
        }

        /* If any File is present in the conversation Then we use rag to get the response */
        console.log(`\n\n[RAG Service] checking context for conversation: ${conversationId}\n--------------------\n`);

        // 2. Generate Embedding
        /* User asks: "What is the warranty?" (Text)
                 You convert: "What is the warranty?" -> [0.12, -0.99, ...] (Vector) */
        const queryVector = await generateEmbedding(userMessage);

        // 3. Vector Search  (Similarity Search) 
        /* use this embede user message to seach in vector database , if the socore id hig the user asked ablout the file 
                  Database Search: You ask MongoDB: "Hey, which stored vectors are seemingly similar to [0.12, -0.99, ...]?"
                  */
        const vectorResults = await EmbeddingModel.aggregate([
            {
                "$vectorSearch": {
                    "index": "vector_index",
                    "path": "embedding",//path: Must match the field name in your Mongoose Schema (embedding).
                    "queryVector": queryVector,
                    "numCandidates": 50,
                    "limit": 3,
                    "filter": {
                        "fileId": { "$in": conversation.files }
                    }
                }
            },
            {
                "$project": {
                    "_id": 1,
                    "text": 1,
                    "score": { "$meta": "vectorSearchScore" }
                }
            }
        ]);
        /* Database Replies: "Found it! It's Chunk #45."
                      Chunk #45 Data:
                          embedding: [0.11, -0.98, ...] (The math match)
                          text: "The standard warranty is 12 months for all parts." (The Human Readable Content) */

        console.log(`[RAG Service] Found ${vectorResults.length} chunks. Top score: ${vectorResults[0]?.score}\n--------------------\n`);

        // 4. Threshold Check (adjusted to 0.35 for better recall) 
        if (vectorResults.length > 0) {
            console.log(`[RAG Service] Top Match Score: ${vectorResults[0]?.score}`);

            // Filter results that meet the minimum relevance threshold
            const relevantChunks = vectorResults.filter(chunk => chunk.score > 0.35);

            if (relevantChunks.length > 0) {
                const contextText = relevantChunks.map(chunk => chunk.text).join("\n---\n");
                return `Use the following context from user's uploaded documents to answer the question:\n\n${contextText}`;
            }
        }

        return null;

    } catch (error) {
        console.error("[RAG Service] Error:", error.message);
        return null; // Fail gracefully, return null so chat continues normally
    }
};

module.exports = {
    performRagCheck
};
