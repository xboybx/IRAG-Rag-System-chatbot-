# 🧠 IRAG: Manual RAG Restoration & Architecture Guide

This document serves as a "Deep Freeze" guide. It explains how to precisely restore the manual **RAG Toggle** button and details the journey of a request from the user's click to the AI's response.

---

## 🏗️ The Full Stack Architecture (Data Flow)

When RAG is enabled manually, the application follows this circuit:

1.  **UI Interaction (Frontend)**: User toggles the `RAG` button in the header.
2.  **State Manifestation**: The React state `ragEnabled` (boolean) updates.
3.  **Network Dispatch**: In `handleSend`, the `useRag` key is injected into the JSON payload of the POST request.
4.  **Backend Ingestion**: `AIcontroller.js` destructures `useRag` from `req.body`.
5.  **Intelligence Decision**: The backend analyzes if it should perform a "Document Search" based on either the user's manual toggle OR the `queryRouter.service.js` decision.
6.  **Context Injection**: If RAG is active, the `rag.service.js` performs a vector similarity search in MongoDB and appends the relevant text to the AI's system prompt.
7.  **Final Response**: The LLM answers the question using your private documents.

---

## 🛠️ Step-by-Step Restoration (Search & Uncomment)

Follow these exact steps to bring back manual control.

### 1. Re-enable the Frontend Variable
**File**: `frontend/app/chat/[[...id]]/page.tsx`  
**Search Term**: `const [ragEnabled`  
**Action**: Remove the `//` prefix.
```tsx
// Location: Line ~54
const [ragEnabled, setRagEnabled] = useState(true); 
```

### 2. Restore the Visual Toggle Button
**File**: `frontend/app/chat/[[...id]]/page.tsx`  
**Search Term**: `RAG Master Toggle`  
**Action**: Delete the `/*` and `*/` surrounding the button block.
```tsx
// Location: Line ~368
{/* RAG Master Toggle */}
<button
    onClick={() => setRagEnabled(!ragEnabled)}
    className={`...`}
>
    ...
</button>
```

### 3. Bind State to the API Request
**File**: `frontend/app/chat/[[...id]]/page.tsx`  
**Search Term**: `body: JSON.stringify({`  
**Action**: Uncomment the line inside the `handleSend` payload.
```tsx
// Location: Line ~139
body: JSON.stringify({
    message: userMessage,
    selectedModel: backendModelName,
    conversationId: currentConversationId,
    history: messages,
    useRag: ragEnabled, // <--- UNCOMMENT THIS
    useWebSearch: webSearch
}),
```

### 4. Adjust the Backend Logic (Controller)
**File**: `backend/Controllers/AIcontroller.js`  
**Search Term**: `if (QueryRouteRes === "RAG")`  
**Action**: Modify the condition to respect the user's manual choice.
```javascript
// Current Line ~90:
if (QueryRouteRes === "RAG") { ... }

// Recommended Modification for Restoration:
if (useRag || QueryRouteRes === "RAG") { 
    // This allows manual override OR smart routing
    const ragContext = await performRagCheck(conversationId, message);
    ...
}
```

### 5. Redux Cleanup (Optional but Recommended)
**File**: `frontend/Redux/Features/Chatslice.ts`  
**Search Term**: `ragEnabled`  
**Action**: Uncomment the parameter definition in the `sendMessage` thunk to keep types consistent across the project.

---

## 💡 Why was this changed?
We moved to the **Query Router** (Backend Line ~86) to reduce user clicks. By having the AI "decide" if it needs document help, the user doesn't have to worry about flipping switches. However, for power users, the manual toggle remains the most reliable way to force the AI to look at data.
