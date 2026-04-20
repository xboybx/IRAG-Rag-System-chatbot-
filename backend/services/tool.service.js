const { performWebSearch } = require("./webSearch.service.js");

/* Tools are simply a json examples , how a ai should answer us accc to the tool or the json */
/* Web Search Tool */
const websearchTool = {
    type: "function",
    function: {
        name: "perform_web_search",
        description: "search in the web/Internet for real-Time information,latest news,prices,weather,or details about events that are not currently in your knowlege Base",
        parameters: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "The optimixed seach query to send the seach Engine(e.g., 'Ethereum price today', 'latest tech news')",
                }
            },
            required: ["query"]
        }
    }
}

const availabletools = [
    websearchTool
]

const executeTool = async (toolName, toolArgs) => {

    switch (toolName) {
        case "perform_web_search":
            return await performWebSearch(toolArgs.query)
        default:
            console.warn(`[Tool Service] Unknown tool requested: ${toolName}`)
            return `Error: Tool '${toolName}' is not recognized by the system.`;

    }

}

module.exports = {
    availabletools,
    executeTool
};

