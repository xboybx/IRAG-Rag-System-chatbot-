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
    "Z-Air": "GLM 4.5 Air",
    "Trinity": "Trinity Mini",
    "Meta Llama": "Meta Llama 3.3 70B Instruct"
    // Add more mappings as needed
};



/* Model names form app.clod */
/* The control loops through the array and uses models if previous one fails */
const AUTO_MODELS = [
    "GLM 4.5 Air",
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

                    const response = await openai.chat.completions.create({
                        model: model,
                        messages: currentMessages,
                        stream: false,
                        tools: finalToolsToPass,
                        tool_choice: finalToolsToPass ? "auto" : undefined  /* AI automatically decides to use tools or not */
                    });

                    /* Now we will have the first ai Response */
                    const responseMessage = response.choices[0].message;

                    // Support providers that return undefined OR an empty array []
                    if (!responseMessage.tool_calls || responseMessage.tool_calls.length === 0) {
                        isToolCall = false;

                        /* Stream the Response */
                        console.log("starting Stream: ")
                        return await openai.chat.completions.create({
                            model: model,
                            messages: currentMessages,
                            stream: true
                        });


                    }
                    else {
                        console.log("AI requesting for tool", responseMessage.tool_calls.map(t => t.function.name))

                        /* now add the ai tool query to hsitory */
                        currentMessages.push(responseMessage)

                        for (const toolcall of responseMessage.tool_calls) {

                            const args = JSON.parse(toolcall.function.arguments);
                            const toolresult = await executeTool(toolcall.function.name, args)

                            /* Push this tool rseult to the cureent message */
                            currentMessages.push({
                                tool_call_id: toolcall.id,
                                role: "tool",
                                name: toolcall.function.name,
                                content: toolresult || "Executed, but returned blank.",
                            });

                        }

                    }

                }
            }
            catch (error) {

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
