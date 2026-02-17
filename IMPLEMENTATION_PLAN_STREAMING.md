# Implementation Plan: Streaming AI Responses

This plan details the changes required to enable real-time streaming of AI responses using Server-Sent Events (SSE) (or simple chunked HTTP) from the backend to the frontend.

## 1. Backend Changes

### A. `backend/services/ai.service.js`
-   Modify `generateResponse` to support a `stream` parameter.
-   When `stream` is true, use `openai.chat.completions.create({ ..., stream: true })`.
-   Return the stream object directly to the controller so it can be piped.

### B. `backend/Controllers/AIcontroller.js`
-   Update `chatController` to handle streaming.
-   **Headers:** Set `Content-Type: text/plain` (or `text/event-stream`), `Transfer-Encoding: chunked`.
-   **Execution:**
    1.  Perform all async setup (DB validation, RAG, Web Search) *before* starting the response.
    2.  If `stream: true` (default):
        -   Call `aiService.generateResponseStream(...)`.
        -   Iterate over the stream: `for await (const chunk of stream)`.
        -   Write chunks to `res`: `res.write(chunk)`.
        -   Accumulate the full text in a variable `fullAiResponse`.
        -   On end (`res.end()`), save `fullAiResponse` to `MessageModel` (Assistant role).
    3.  If `stream: false` (legacy/fallback), keep existing behavior.

## 2. Frontend Changes

### A. `frontend/Redux/Features/Chatslice.ts`
-   We generally **avoid** putting the stream chunks into Redux because dispatching 50 actions per second kills performance.
-   **Action:** Add a `addStreamingMessage` reducer that updates the *last* message's content efficiently? No, still too much specific Redux overhead.
-   **Better Approach:**
    -   Keep Redux for *committed* messages.
    -   Use local component state (or a Ref) for the *incoming* stream.
    -   Once stream finishes, dispatch `addMessage` (or `updateLastMessage`) to Redux with the final text.
-   **Action:** Add `updateLastMessageContent` reducer to `ChatSlice` to finalize the message once streaming is done.

### B. `frontend/app/chat/[[...id]]/page.tsx`
-   **Refactor `handleSend`:**
    1.  Append user message to Redux immediately (Optimistic UI).
    2.  Create a placeholder "Assistant" message in Redux (empty content) so the UI shows a bubble.
    3.  **Fetch API:** Use centralized `fetch` (with auth headers manually or via helper) to call `/ai/chat`.
    4.  **Stream Reader:**
        -   `const reader = response.body.getReader();`
        -   `while (true) { const { done, value } = await reader.read(); ... }`
        -   Decode chunks (`TextDecoder`).
        -   Update local state `streamingContent` -> Pass to `MessageContent` component.
        -   **Crucial:** We need to update the *specific* message bubble in the UI. We can do this by having the last message in the list use the `streamingContent` if it's loading.
    5.  **Completion:**
        -   Dispatch `updateLastMessageContent({ content: fullText })` triggers Redux update.
        -   Clear local streaming state.

## 3. Detailed Steps

### Step 1: Backend Service
Update `generateResponse` to support streaming.

```javascript
// backend/services/ai.service.js
const generateResponse = async (messages, selectedModel, stream = false) => {
    // ... model selection ...
    if (stream) {
        return await openai.chat.completions.create({
            model: model,
            messages: [...],
            stream: true,
        });
    }
    // ... existing logic ...
}
```

### Step 2: Backend Controller
Update `chatController` to manage the stream lifecycle.

### Step 3: Frontend Redux
Add `addPlaceholderMessage` and `updateMessageContent` actions.

### Step 4: Frontend Component
Implement the `fetch` and `reader` loop in `ChatPage.tsx`.

---
**Note:** We need to ensure authentication headers are passed in the `fetch` call since we won't be using the `axiosInstance` interceptor for the streaming request (Axios streaming support in browser is difficult/non-standard).
