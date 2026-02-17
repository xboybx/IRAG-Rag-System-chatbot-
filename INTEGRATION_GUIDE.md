# Backend & Frontend Integration Guide

## **Handling "New Conversation" Flow**

You are correct. We need to handle the case where `conversationId` is missing (i.e., the user is starting a brand new chat).

### 1. The Route Issue
The backend route is defined as:
`POST /ai/chat/:ConversationId`

This means you **MUST** provide *something* in the URL place of `:ConversationId`. You cannot leave it empty (e.g., `POST /ai/chat/`) or it will be a 404 (or match a different route).

### 2. Recommended Frontend Approach
When the user is on a "New Chat" page (e.g. `conversationId` is `null` in your Redux store):

1.  **URL**: Send the request to `http://localhost:5000/ai/chat/new`
    *   The string `"new"` effectively acts as a dummy placeholder to satisfy the router.
2.  **Body**: In the JSON body, ensure you **DO NOT** send a valid `conversationId` (or send it as `null`).
    *   Backend logic: `let { conversationId } = req.body; if (!conversationId) { createNew... }`
    *   This triggers the auto-creation logic.

### 3. Step-by-Step Flow

#### A. Initial State (Redux)
```javascript
{
  messages: [],
  currentConversationId: null, // Indicates new chat
  isLoading: false
}
```

#### B. Component Logic (User clicks Send)
```javascript
const handleSendMessage = (text) => {
  const currentId = useAppSelector(state => state.chat.currentConversationId); 
  
  // Dispatch Thunk
  dispatch(sendMessage({ 
    message: text, 
    model: selectedModel, 
    conversationId: currentId, // might be null
    history: messages 
  }));
}
```

#### C. Async Thunk Implementation
This is the critical part. You need to handle the URL construction and the "New" ID logic here.

```javascript
export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async ({ message, history, conversationId, model }, { rejectWithValue }) => {
    try {
      // 1. Construct URL
      // If we have an ID, use it. If not, use 'new' as placeholder.
      const urlId = conversationId || 'new'; 
      
      const response = await axios.post(
        `http://localhost:5000/ai/chat/${urlId}`,
        {
          message,
          selectedModel: model,
          // CRITICAL: Send null/undefined if it's new, so backend logic triggers
          conversationId: conversationId, 
          history: history,
          useRag: true
        },
        { withCredentials: true } 
      );
      
      return response.data; // { conversationId: "NEW_ID_123", data: {...} }
      
    } catch (err) {
      return rejectWithValue(err.response?.data || "Error");
    }
  }
);
```

#### D. Redux Reducer (Updating the Store)
When the request succeeds, the backend returns the *actual* newly created ID. You must update your store with this.

```javascript
extraReducers: (builder) => {
  builder.addCase(sendMessage.fulfilled, (state, action) => {
    state.isLoading = false;
    
    // 1. Add AI Message
    state.messages.push({ 
        role: "assistant", 
        content: action.payload.data.content 
    });

    // 2. IMPORTANT: Update Conversation ID
    // If we started with null, we now have the real ID from the backend
    if (!state.currentConversationId) {
        state.currentConversationId = action.payload.conversationId;
        
        // OPTIONAL: Update Browser URL without reloading
        // window.history.pushState(null, '', `/chat/${action.payload.conversationId}`);
    }
  });
}
```

### Summary
*   **Route**: `/chat/new` (placeholder)
*   **Body**: `{ conversationId: null }`
*   **Response**: `{ conversationId: "real_db_id" }`
*   **Action**: Update Redux Store `currentConversationId` -> Update Browser URL.
