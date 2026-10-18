const Openai = require("openai");

const defaultHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};
if (process.env.SITE_URL) {
    defaultHeaders['HTTP-Referer'] = process.env.SITE_URL;
}
if (process.env.SITE_NAME) {
    defaultHeaders['X-Title'] = process.env.SITE_NAME;
}

const openai = new Openai({
    baseURL: process.env.EMBED_MODEL_BASE_URL,
    apiKey: process.env.EMBED_MODEL_API_KEY,
    defaultHeaders: defaultHeaders,
});

const EMBED_MODEL = process.env.EMBED_MODEL || "text-embedding-3-small";
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

        const response = await openai.embeddings.create({
            model: EMBED_MODEL, // Standard reliable model (cheap)
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
        if (!chunks || chunks.length === 0) return [];

        // Clean texts for all chunks
        const cleanTexts = chunks.map(chunk => chunk.pageContent.replace(/\n/g, " "));

        // Single batch API call (supports up to 2048 items at once)
        const response = await openai.embeddings.create({
            model: EMBED_MODEL,
            input: cleanTexts,
        });

        // Map embeddings back to schema documents preserving order
        const embeddingDocs = response.data.map((item, index) => ({
            fileId: fileId,
            text: chunks[index].pageContent,
            embedding: item.embedding,
            metadata: {
                chunkIndex: index,
                conversationId: conversationId
            }
        }));

        return embeddingDocs;
    } catch (error) {
        console.error("Error generating batch embeddings for chunks:", error.message);
        throw error;
    }
}

module.exports = {
    generateEmbedding,
    generateEmbeddingForChunks
};
