const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

/* if the user uses the we seach option we use this perform web search  */

const performWebSearch = async (query) => {


    try {
        console.log(`\n\n[WebSearch Service] Activated. Searching for: "${query}"\n--------------------`);

        const response = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${TAVILY_API_KEY}`,
            },
            body: JSON.stringify({
                query: query,
                max_results: 5,
                search_depth: "basic",
            })
        })
        if (!response.ok) {
            /* The error will be caught.
            Crucially, it will log: [WebSearch Service] Error: Search failed: 402 ... (Returning NULL).
            The function will return null.
            Your 
            AIcontroller.js
             will see null, simply skip the search context injection, and proceed to generate an answer normally using only the AI's internal knowledge (or RAG if available). */
            const errorBody = await response.text(); // Get detailed error from Tavily
            throw new Error(`Search failed: ${response.status} ${response.statusText} - ${errorBody}`);
        }

        const data = await response.json();
        if (!data.results || data.results.length === 0) {
            console.log("\n--------------------\n[WebSearch Service] No results found.\n--------------------\n");
            return null;
        }


        console.log(`\n--------------------\n[WebSearch Service] Usefull results found: ${data.results.length}\n--------------------\n`);

        // Format response coame from the tavily to send ai for the LLM
        let contextString = "--- WEB SEARCH RESULTS ---\n";
        if (data.answer) contextString += `Direct Answer: ${data.answer}\n\n`;
        data.results.forEach((result, index) => {
            contextString += `[Source ${index + 1}]: ${result.title}\n`;
            contextString += `URL: ${result.url}\n`;
            contextString += `Content: ${result.content.substring(0, 300)}...\n\n`;
        });

        contextString += "--- END OF SEARCH RESULTS ---";
        return contextString;

    } catch (error) {
        console.error(`\n--------------------\n[WebSearch Service] Error: ${error.message}\n(Returning NULL, continuing without search)\n--------------------\n`);
        return null;
    }

}

/* Simple heuristic to decide if we SHOULD search automatically.
 * Checks for keywords like "latest", "price", "who is", etc.
 */
const shouldAutoSearch = (query) => {
    const keywords = [
        "latest", "current", "news", "today", "price", "weather",
        "who is", "what is", "when is", "upcoming", "2024", "2025"
    ];
    const match = keywords.some(k => query.toLowerCase().includes(k));
    if (match) {
        console.log(`\n--------------------\n[WebSearch Service] Auto-trigger: Query contains keyword match.\n--------------------\n`);
    }
    return match;
};
module.exports = { performWebSearch, shouldAutoSearch };
