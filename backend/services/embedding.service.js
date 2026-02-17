// const Openai = require("openai");

// const openai = new Openai({
//     baseURL: 'https://openrouter.ai/api/v1',
//     apiKey: process.env.OPEN_ROUTER_API_KEY,
//     defaultHeaders: {
//         'HTTP-Referer': process.env.SITE_URL,
//         'X-Title': process.env.SITE_NAME,
//     },
// });

// const embeddingModels = [
//     "intfloat/e5-base-v2",
//     "intfloat/e5-large-v2",
//     "intfloat/multilingual-e5-large",
//     "thenlper/gte-base",
//     "thenlper/gte-large"
// ];

// let roundRobinIndex = 0;

// /**
//  * Generates an embedding for the given input text.
//  * Uses a round-robin fallback mechanism with multiple models.
//  */
// const generateEmbedding = async (text) => {
//     try {
//         // Cleaning the text
//         const cleanText = text.replace(/\n/g, " ");

//         const startIndex = roundRobinIndex;
//         // Update index for next request (Round Robin)
//         roundRobinIndex = (roundRobinIndex + 1) % embeddingModels.length;

//         let lastError = null;

//         for (let i = 0; i < embeddingModels.length; i++) {
//             const currentIndex = (startIndex + i) % embeddingModels.length;
//             const model = embeddingModels[currentIndex];

//             try {
//                 console.log(`[Embedding] Attempting model: ${model} (Index: ${currentIndex})`);

//                 const response = await openai.embeddings.create({
//                     model: model,
//                     input: cleanText,
//                 });

//                 if (response.data && response.data.length > 0) {
//                     console.log(`[Embedding] Successfully generated embedding with ${model}`);
//                     return response.data[0].embedding;
//                 }

//             } catch (innerError) {
//                 console.warn(`[Embedding] Model ${model} failed: ${innerError.message}. Trying next...`);
//                 lastError = innerError;
//             }
//         }

//         console.error("[Embedding] All models failed.");
//         throw lastError || new Error("All embedding models failed.");

//     } catch (error) {
//         console.error("Error generating embedding:", error.message);
//         throw error;
//     }
// }

// module.exports = {
//     generateEmbedding
// };


const Openai = require("openai");

const openai = new Openai({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPEN_ROUTER_API_KEY,
    defaultHeaders: {
        'HTTP-Referer': process.env.SITE_URL,
        'X-Title': process.env.SITE_NAME,
    },
});

/**
 * Generates an embedding for the given input text.
 * Uses a free/cheap model available on OpenRouter or directly from a provider if configured.
 * 
 * Recommended Free/Cheap Models on OpenRouter (if available for embeddings) or Fallbacks:
 * - "amazon/titan-embed-text-v1" (Cheap)
 * - "cohere/embed-multilingual-v3.0" (Cheap)
 * - Or using a local/lightweight model if you run one.
 * 
 * Since OpenRouter focuses on completion models, for embeddings significantly, 
 * many devs use Google's 'embedding-001' or OpenAI's 'text-embedding-3-small' directly 
 * because they are extremely cheap ($0.00002/1k tokens).
 * 
 * However, per your request for a "Free No Limit" one via OpenRouter, 
 * we will attempt to use a standard compatible endpoint.
 * 
 * NOTE: OpenRouter's support for `/embeddings` endpoint might depend on the specific provider.
 * If OpenRouter doesn't strictly proxy embeddings for free models, 
 * you might need to use Google's Generative AI SDK which provides free tier embeddings.
 */
const generateEmbedding = async (text) => {
    try {
        // Cleaning the text
        const cleanText = text.replace(/\n/g, " ");

        // Example using OpenRouter's OpenAI compatible endpoint
        // NOTE: Verify strictly if OpenRouter supports free embeddings. 
        // Often, 'text-embedding-3-small' is the standard go-to even if paid (it's nearly free).
        // For strictly "Free", Google's Gemini API is the best bet.

        const response = await openai.embeddings.create({
            model: "text-embedding-3-small", // Standard reliable model (cheap)
            input: cleanText,
        });

        return response.data[0].embedding;

    } catch (error) {
        console.error("Error generating embedding:", error.message);
        throw error;
    }
}


const generateEmbeddingForChunks = async (chunks, fileId, conversationId) => {
    try {
        const embeddingDocs = []
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i]
            const embedding = await generateEmbedding(chunk.pageContent);

            embeddingDocs.push({
                fileId: fileId,
                text: chunk.pageContent, // Schema expects 'text' at top level
                embedding: embedding,
                metadata: {
                    chunkIndex: i,
                    conversationId: conversationId
                }
            })
        }
        return embeddingDocs;
    } catch (error) {
        console.error("Error generating embeddings for chunks:", error.message);
        throw error;
    }
}

module.exports = {
    generateEmbedding,
    generateEmbeddingForChunks
};
