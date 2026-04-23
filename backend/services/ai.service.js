const Openai = require("openai");
const { systemPrompt } = require("../utils/systemPrompt.js");
const { availabletools, executeTool } = require("./tool.service.js");


/* SDK Open Ai */
const openai = new Openai({
    baseURL: process.env.AI_BASE_URL,
    apiKey: process.env.AI_API_KEY,
    defaultHeaders: {
        'HTTP-Referer': process.env.SITE_URL, // Optional. Site URL for rankings on openrouter.ai.
        'X-Title': process.env.SITE_NAME, // Optional. Site title for rankings on openrouter.ai.
    },
});


const MODEL_MAPPING = {
    // "GPT OSS": "GPT OSS 120B",
    "Trinity": "Trinity Mini",
    "Meta Llama": "Meta Llama 3.3 70B Instruct"
    // Add more mappings as needed
};



/* Model names form app.clod */
/* The control loops through the array and uses models if previous one fails */
const AUTO_MODELS = [
    // "GPT OSS 120B",
    "Trinity Mini",
    "Meta Llama 3.3 70B Instruct"

];

//Here Messages params are Context Array of previous conversation
const summarizeHistory = async (messages) => {
    // If messages are few, no need to summarize
    if (messages.length < 5) return messages;

    try {
        const historyText = messages.map(m => `${m.role}: ${m.content}`).join("\n");
        const summaryResponse = await openai.chat.completions.create({
            model: "Trinity Mini", // Use a fast, free model for summarization
            messages: [
                { role: "system", content: "Summarize the following conversation history concisely in 5-6 sentences. Maintain key facts." },
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

const generateResponse = async (messages, selectedModel, toolConfig) => {
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

        // Wrap the streaming logic inside an AsyncGenerator to immediately return the stream object instance
        const streamGenerator = async function* () {
            for (let model of modelsToTry) {
                try {
                    let currentMessages = [
                        { role: "system", content: systemPrompt() },
                        ...finalMessages
                    ];

                    console.log(`\n--------------------\n[AI Service] Attempting model: ${model}\n--------------------\n`);

                    let isToolCall = true;

                    while (isToolCall) {
                        /* Now filter the tools wich are true */
                        const activeTools = availabletools.filter(tool => toolConfig[tool.function.name] === true);

                        // If the array is empty, we must pass 'undefined' to ai , so it doesn't crash
                        const finalToolsToPass = activeTools.length > 0 ? activeTools : undefined;

                        console.log(`[DEBUG] Call to OpenAI (stream: true) started at ${new Date().toISOString()}`);

                        const stream = await openai.chat.completions.create({
                            model: model,
                            messages: currentMessages,
                            stream: true,
                            tools: finalToolsToPass,
                            tool_choice: finalToolsToPass ? "auto" : undefined
                        });

                        let toolCallsCollector = {};
                        let hasToolCallsInStream = false;
                        let fullContent = "";

                        for await (const chunk of stream) {
                            const delta = chunk.choices[0]?.delta;

                            if (delta?.tool_calls) {
                                hasToolCallsInStream = true;
                                for (const tc of delta.tool_calls) {
                                    if (!toolCallsCollector[tc.index]) {
                                        toolCallsCollector[tc.index] = {
                                            id: tc.id,
                                            type: "function",
                                            function: { name: tc.function?.name || "", arguments: tc.function?.arguments || "" }
                                        };
                                    } else {
                                        if (tc.function?.name) toolCallsCollector[tc.index].function.name += tc.function.name;
                                        if (tc.function?.arguments) toolCallsCollector[tc.index].function.arguments += tc.function.arguments;
                                    }
                                }
                            } else if (delta?.content) {
                                fullContent += delta.content;
                                yield chunk; // Stream to user in real-time immediately!
                            }
                        }

                        if (hasToolCallsInStream) {
                            const toolCallsArray = Object.values(toolCallsCollector);
                            console.log("AI requesting for tool", toolCallsArray.map(t => t.function.name));

                            currentMessages.push({
                                role: "assistant",
                                content: fullContent || null, // Can be null if it just returned tool calls
                                tool_calls: toolCallsArray
                            });

                            for (const toolcall of toolCallsArray) {
                                let args = {};
                                try {
                                    args = JSON.parse(toolcall.function.arguments || "{}");
                                } catch (e) {
                                    console.error("JSON parse error for tool arguments:", e);
                                }
                                const toolresult = await executeTool(toolcall.function.name, args);

                                currentMessages.push({
                                    tool_call_id: toolcall.id,
                                    role: "tool",
                                    name: toolcall.function.name,
                                    content: toolresult || "Executed, but returned blank.",
                                });
                            }
                            isToolCall = true; // loop will continue
                        } else {
                            isToolCall = false; // We got the final stream, tools are done
                            return; // exit generator gracefully
                        }
                    }
                } catch (error) {
                    console.log(`\n--------------------\n`, "[AI Service] Model ", model, " failed:", error.message, "\n--------------------\n");
                    continue; // try next model fallback
                }
            }

            // Exiting without returning natively means all models failed
            yield { choices: [{ delta: { content: "\n[Error: No response from any model]" } }] };
        };

        return streamGenerator();

    } catch (error) {
        return { error: "Error in generating response from (generateResponse function)", message: error.message };
    }
};

module.exports = {
    generateResponse
}
