const Openai = require("openai");

const openai = new Openai({
    baseURL: process.env.GROQ_BASE_URL,
    apiKey: process.env.GROQ_API_KEY,
});


const prompt = `You are an expert Query Router embedded in an advanced AI chat application. Your sole responsibility is to analyze the user's latest query and determine whether it requires retrieving information from user-uploaded documents/files (RAG) or if it can be answered using general knowledge (GENERAL).

Your decision is critical to the application's performance. Analyze the query carefully against the following routing rules:

# ROUTING RULES
1. ACTION: RAG
Trigger this action if the query:
- Explicitly mentions an uploaded document, file, PDF, image, or context.
- Uses implicit pronouns indicating a provided file (e.g., "what is this?", "explain this", "what does it say?").
- Asks for summaries, extractions, or analysis of provided, localized data.

2. ACTION: GENERAL
Trigger this action if the query:
- Is a standard conversational greeting.
- Asks general knowledge, trivia, or factual questions.
- Requests code generation, creative writing, or brainstorming independent of uploaded files.

# EXAMPLES OF "RAG" TRIGGERS
- "what is this doc about?"
- "explain the uploaded file."
- "whats this?"
- "what does this file have?"
- "summarize page 3."
- "find the revenue numbers in this report."

# EXAMPLES OF "GENERAL" TRIGGERS
- "Write a python script for a calculator."
- "What is the capital of France?"
- "Hello, how are you?"
- "Explain quantum physics to a 5 year old."

# OUTPUT CONSTRAINTS
You must output strictly ONE word: either "RAG" or "GENERAL".
Do not include any preamble, explanations, punctuation, or conversational text. Your output will be parsed directly by a system script.

# INPUT
User Query: {content}

# OUTPUT`
/**
 * Uses an LLM to decide if the query should go to RAG or General Knowledge.
 */
const routeQuery = async (query) => {
    try {




        const response = await openai.chat.completions.create({
            model: process.env.GROQ_MODEL,
            messages: [
                {
                    role: "system",
                    content: prompt,
                },
                { role: "user", content: query }
            ],
            max_tokens: 5
        });

        const action = response.choices[0].message.content.trim().toUpperCase();
        console.log(`[Query Router] Decided path: ${action}`);
        return action === "RAG" ? "RAG" : "GENERAL";
    } catch (e) {
        console.error("[Query Router] Failed, defaulting to search.", e.message);
        return "RAG";
    }
};

module.exports = {
    routeQuery
}