const Openai = require("openai");
const { systemPrompt } = require("../utils/systemPrompt.js");


//Open ai sdk from open Router
const openai = new Openai({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPEN_ROUTER_API_KEY,
    defaultHeaders: {
        'HTTP-Referer': process.env.SITE_URL, // Optional. Site URL for rankings on openrouter.ai.
        'X-Title': process.env.SITE_NAME, // Optional. Site title for rankings on openrouter.ai.
    },
});

// Map of user-friendly names to OpenRouter Model IDs (when selected specific model)
const MODEL_MAPPING = {
    "Arce-Large": "arcee-ai/trinity-large-preview:free",
    "Solar-Pro-3": "upstage/solar-pro-3:free",
    "LFM-2.5-1.2B-Thinking": "liquid/lfm-2.5-1.2b-thinking:free"
    // Add more mappings as needed
};

const AUTO_MODELS = [
    "upstage/solar-pro-3:free",
    "arcee-ai/trinity-large-preview:free",
    "liquid/lfm-2.5-1.2b-thinking:free"

];

//Here Messages params are Context Array of previous conversation
const summarizeHistory = async (messages) => {
    // If messages are few, no need to summarize
    if (messages.length < 5) return messages;

    try {
        const historyText = messages.map(m => `${m.role}: ${m.content}`).join("\n");
        const summaryResponse = await openai.chat.completions.create({
            model: "google/gemini-2.0-flash-lite-001", // Use a fast, free model for summarization
            messages: [
                { role: "system", content: "Summarize the following conversation history concisely in 3-4 sentences. Maintain key facts." },
                { role: "user", content: historyText }
            ]
        });

        const summary = summaryResponse.choices[0].message.content;
        console.log("\n--------------------\n[AI Service] Context is large (>10 messages). Summarizing history...\n--------------------\n");
        console.log("\n--------------------\n[AI Service] Generated Summary:\n--------------------\n", summary);
        return [
            { role: "system", content: `Previous Context Summary: ${summary}` },
            messages[messages.length - 1] // Always keep the very last message (User's new query) as is
        ];
    } catch (e) {
        console.error("\n--------------------\n[AI Service] Summarization failed, using full history:\n--------------------\n", e);
        return messages;
    }
};

const generateResponse = async (messages, selectedModel, stream = false) => {
    try {
        let modelsToTry = [];

        // ... (Model selection logic remains same) ...
        if (selectedModel === "auto") {
            modelsToTry = [...AUTO_MODELS];
        } else {
            const isSelectedModel_Valid = MODEL_MAPPING[selectedModel];
            if (!isSelectedModel_Valid) {
                return { error: "Invalid Model" };
            }
            modelsToTry.push(isSelectedModel_Valid);
        }

        const finalMessages = messages.length > 10 ? await summarizeHistory(messages) : messages;

        for (let model of modelsToTry) {
            try {
                console.log(`\n--------------------\n[AI Service] Attempting model: ${model} (Stream: ${stream})\n--------------------\n`);

                const response = await openai.chat.completions.create({
                    model: model,
                    messages: [
                        { role: "system", content: systemPrompt() },
                        ...finalMessages
                    ],
                    stream: stream, // Pass stream parameter
                });

                if (stream) {
                    // Start reading the stream immediately to catch initial errors? 
                    // No, just return the stream. Controller will handle iteration.
                    return response;
                }

                console.log("\n--------------------\n", "[AI Service] Response from model: ", response.choices[0].message.content, "\n--------------------\n");
                return { content: response.choices[0].message.content };
            } catch (error) {
                console.log(`\n--------------------\n`, "[AI Service] Model ", model, " failed:", error.message, "\n--------------------\n");
                continue;
            }
        }
        return { error: "No response from any model" };

    } catch (error) {
        return { error: "Error in generating response from (generateResponse function)", message: error.message };
    }
};

module.exports = {
    generateResponse
}
