# Deep Dive: Frontend Architecture & Data Flow

This document provides a granular, line-by-line explanation of how the RAG System's frontend works. It covers the exact flow of data, state updates, API request handling, and component interaction.

---

## 1. The Core Engine: `axiosInstance.ts` (Network Layer)

This file (`frontend/Redux/axiosInstance.ts`) is the **heart** of all backend communication. It ensures every request is authenticated and handles errors automatically.

### **Creation & Configuration**
```typescript
const axiosInstance = axios.create({
    baseURL: API_URL, // e.g., http://localhost:5000
    withCredentials: true, // IMPORTANT: Allows sending/receiving HttpOnly cookies (for refresh tokens)
    headers: {
        "Content-Type": "application/json",
    },
});
```

### **The Request Interceptor (Outgoing)**
**What it does:** Before *any* request leaves the browser, this function runs.
1.  **Read State:** It accesses `store.getState().auth.accessToken` to get the current JWT.
2.  **Attach Token:** If a token exists, it adds `Authorization: Bearer <token>` to the headers.
3.  **Why:** This means you don't need to manually add the token in every single API call component.

### **The Response Interceptor (Incoming)**
**What it does:** When the backend sends a response back, this function checks it *before* your component sees it.

**Scenario A: Success (200 OK)**
-   The response passes through unchanged.

**Scenario B: Error (401 Unauthorized)**
-   This happens when the `accessToken` has expired (usually after 15-60 mins).
-   **Auto-Refresh Logic:**
    1.  **Check:** Is this a 401 error? AND have we already tried to refresh? (`_retry` flag).
    2.  **Flag:** Set `originalRequest._retry = true` to prevent an infinite loop.
    3.  **Call Backend:** Send a `POST /user/refresh` request (using the HttpOnly cookie).
    4.  **Update State:**
        -   If successful, getting a new `accessToken`.
        -   Dispatch `setToken(newToken)` to Redux (updating `state.auth.accessToken`).
        -   Update the *original* request's header with the new token.
    5.  **Retry:** Execute `axiosInstance(originalRequest)` again. The user never knows it failed!
    6.  **Failure:** If refresh fails (e.g., cookie expired), dispatch `logoutUser()` to clear state and redirect to login.

---

## 2. Redux State Management (The "Brain")

Redux holds the "Global Variables" of your app. These are updated via **Actions** (simple payloads) or **Thunks** (async functions).

### **A. User State (`UserSlice.ts`)**
Tracks: Is the user logged in? Who are they?
-   **Variables:**
    -   `user`: Object `{ id, name, email }` or `null`.
    -   `accessToken`: String (JWT) or `null`.
    -   `isAuthenticated`: Boolean (`true` if token exists).
    -   `isLoading`: Boolean (UI spinner).
    -   `isError`: Boolean.
-   **Key Thunks:**
    -   `loginUser(credentials)`:
        1.  **Start:** Sets `isLoading = true`.
        2.  **API:** `POST /user/login`.
        3.  **Success:** Updates `user`, `accessToken`, `isAuthenticated = true`. Sets `isLoading = false`.
        4.  **Fail:** Sets `isError = true`, `error = message`.
    -   `checkAuth()`:
        -   Called on app load. Checks if a refresh token cookie exists/is valid.
        -   If yes, it silently logs the user in (updates state).
    -   `logoutUser()`:
        -   Calls `POST /user/logout` (backend clears cookie).
        -   Clears *all* frontend state (`user = null`, `isAuthenticated = false`).

### **B. Chat State (`ChatSlice.ts`)**
Tracks: The current conversation window.
-   **Variables:**
    -   `messages`: Array `[{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'hello' }]`.
    -   `currentConversationId`: String (ID of active chat) or `null` (New Chat).
    -   `model`: String (e.g., "gpt-4", "llama-3").
    -   `isUploading`: Boolean (Spinner for file upload).
    -   `uploadedFile`: Object `{ name: 'doc.pdf', id: '123' }` or `null`.
-   **Key Actions:**
    -   `addMessage(msg)`: Immediately adds a user message to the UI (optimistic update).
    -   `sendMessage(data)`:
        -   **Async:** Sends prompt to `/ai/chat`.
        -   **Pending:** Sets `isLoading = true` (shows "AI is thinking...").
        -   **Fulfilled:**
            -   Appends AI response to `messages`.
            -   If it was a "New Chat", updates `currentConversationId` with the new ID from backend.
        -   **Rejected:** Sets error message.
    -   `uploadFile(file)`:
        -   **Pending:** Sets `isUploading = true`.
        -   **Fulfilled:** Sets `isUploading = false`, updates `uploadedFile` with file details.

### **C. History State (`ConversationHistorySlice.ts`)**
Tracks: The sidebar list.
-   **Variables:**
    -   `conversations`: Array `[{ id: '1', title: 'React Help' }, ...]`.
-   **Key Actions:**
    -   `fetchConversations()`: Populates the list from `/ai/history`.
    -   `deleteConversationThunk(id)`:
        -   **Fulfilled:** Filters the `conversations` array to remove the deleted ID.
    -   `createConversation(title)`:
        -   **Fulfilled:** Adds the new conversation to the *top* of the list (`unshift`).

---

## 3. Component Deep Dive (The "Face")

### **A. `AuthWrapper.tsx` (The Gatekeeper)**
-   **Role:** Wraps the app to handle session checks.
-   **Logic:**
    -   `useEffect` runs once on mount.
    -   Dispatches `checkAuth()`.
    -   If `!isAuthenticated` and route is protected (e.g., `/chat`), redirects to `/login`.

### **B. `ChatPage.tsx` (The Main Controller)**
This component orchestrates everything.

1.  **Initialization (`useEffect`):**
    -   Reads `params.id` from URL.
    -   If `id` exists: Dispatches `fetchMessages(id)` (State: `messages` populates).
    -   If `id` is missing: Dispatches `clearMessages()` (State: `messages` becomes empty).

2.  **Sending a Message (`handleSend`):**
    -   **Validation:** Checks if `input` is not empty.
    -   **Optimistic UI:** Dispatches `addMessage({ role: 'user', content: input })` -> UI updates immediately.
    -   **API Call:** Dispatches `sendMessage` thunk.
    -   **Navigation:** If `currentConversationId` was `null`, the backend creates a new ID.
        -   `sendMessage.fulfilled` returns `{ conversationId: 'new_id' }`.
        -   `router.push('/chat/new_id')` updates the URL without reloading.

3.  **File Upload (`handleFileUpload`):**
    -   **Trigger:** User selects file.
    -   **Check:** Is there a conversation ID?
        -   **No (New Chat):**
            1.  Dispatch `createConversation("New Chat")`.
            2.  Wait for ID (`result.payload.id`).
            3.  Update URL (`router.push`).
            4.  Proceed to upload.
        -   **Yes:** Proceed directly.
    -   **Upload:** Dispatch `uploadFile`.
    -   **Feedback:** `isUploading` state shows a spinner on the button. `uploadedFile` state shows the file pill.

### **C. `ConversationSidebar.tsx` (Navigation)**
-   **Display:** Maps through `conversations` (from Redux).
-   **Active State:** Highlights the chat where `id === currentConversationId`.
-   **Delete Action:**
    -   User clicks Trash icon.
    -   Dispatch `deleteConversationThunk(id)`.
    -   **Critical UX:** If the deleted chat was the *active* one (`id === currentConversationId`), it redirects `router.push('/chat')` to prevent a 404 state.

### **D. `MessageContent.tsx` (Renderer)**
-   **Role:** Takes raw markdown text and makes it look good.
-   **Dependencies:**
    -   `react-markdown`: Parses `**bold**`, `*italic*`, lists.
    -   `remark-gfm`: Parses tables/GFM.
    -   `SyntaxHighlighter`: Detects ```code blocks```.
        -   Extracts language (e.g., `javascript`).
        -   Renders colored code.
        -   Adds a "Copy" button to clipboard.

---

## 4. Full Data Flow Example: Sending a Message with RAG

1.  **User Trigger:** Types "Analyze this file" and hits Send.
2.  **`ChatPage.tsx`:**
    -   `dispatch(addMessage(...))` -> **Redux:** `chat.messages` updates -> **UI:** Shows user bubble.
    -   `dispatch(sendMessage({ message, conversationId, ragEnabled: true }))`.
3.  **`ChatSlice.ts` (Thunk):**
    -   `state.isLoading = true` -> **UI:** Shows "Thinking..." gradient.
    -   Calls `axiosInstance.post('/ai/chat', data)`.
4.  **`axiosInstance.ts`:**
    -   **Interceptor:** Adds `Authorization: Bearer <token>`.
    -   Sends request.
5.  **Backend Processing:**
    -   Validates Token (Middleware).
    -   **RAG Service:** Checks DB for file embeddings related to this `conversationId`.
    -   **AI Service:** Sends User Prompt + File Context to LLM.
    -   Returns: `{ content: "Here is the analysis...", conversationId: "123" }`.
6.  **`ChatSlice.ts` (Thunk Fulfilled):**
    -   `state.isLoading = false`.
    -   `state.messages.push({ role: 'assistant', content: response })`.
    -   **UI:** "Thinking..." disappears, AI bubble appears with text.
7.  **`ChatPage.tsx`:**
    -   If it was a new chat, `router.push('/chat/123')` updates the URL.
    -   Future messages use this ID.
