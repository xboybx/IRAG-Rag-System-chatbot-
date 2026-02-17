# Frontend Architecture & Implementation Guide

This document explains the entire frontend structure of the RAG System, detailing how components interact with Redux, handle API requests, and coordinate with the backend.

## 1. High-Level Architecture

The frontend is built using **Next.js (App Router)** for routing and server-side rendering, **Redux Toolkit** for complex state management, and **Axios** for handling HTTP requests with authentication.

- **Routing:** Handled by Next.js file-system routing (`app/`).
- **State Management:** Redux stores global data like user session, chat messages, UI toggles, and conversation history.
- **Networking:** A centralized `axiosInstance` handles all API calls, automatically attaching tokens and managing refresh logic.

---

## 2. Redux Store: The "Brain" of the App

The Redux store (`Redux/Store.ts`) is the single source of truth for the application's state. It combines multiple "slices" of state into one global object.

### A. The Network Layer (`Redux/axiosInstance.ts`)
This is the most critical part for backend communication. It is a configured Axios instance that:
1.  **Base URL:** Points to your backend (e.g., `http://localhost:5000`).
2.  **Request Interceptor:** Automatically grabs the `accessToken` from the Redux store (via `store.getState()`) and attaches it to the `Authorization: Bearer <token>` header of *every* request. This ensures all calls are authenticated.
3.  **Response Interceptor:**
    -   Intercepts `401 Unauthorized` errors (typically meaning the access token expired).
    -   Automatically calls the `/user/refresh` endpoint to get a new access token.
    -   If successful, updates the Redux store with the new token and **retries the original failed request**.
    -   If refresh fails (e.g., refresh token expired), it logs the user out.

### B. State Slices (Redux Logic)

#### 1. `UserSlice.ts` (Authentication)
-   **Purpose:** Manages the user's login session.
-   **Key Actions:**
    -   `loginUser`: Sends credentials to `/user/login`. On success, stores `user` data and `accessToken`.
    -   `checkAuth`: Called on app load (`AuthWrapper.tsx`) to verify if the user is still logged in (via cookie/token check).
    -   `logoutUser`: Calls `/user/logout` and clears the frontend state.
-   **Why:** Ensures the UI knows if a user is logged in to show protected pages.

#### 2. `ChatSlice.ts` (Active Conversation)
-   **Purpose:** Manages the *current* chat session, messages, and uploaded files.
-   **Key Actions:**
    -   `sendMessage`:
        -   Sends user input to `/ai/chat/:id`.
        -   Backend returns the AI response.
        -   Redux appends both the user message and AI response to the `messages` array.
    -   `fetchMessages`: Fetches previous messages when opening an existing chat (`/ai/chat/:id`).
    -   `uploadFile`:
        -   Sends a file to `/ai/dataset-upload`.
        -   Manages `isUploading` state (spinner) and `uploadedFile` state (UI indicator).
    -   `setConversationId`: Tracks which conversation is currently active in the URL.
-   **Why:** This isolates the complex logic of sending messages, handling loading states ("AI is thinking..."), and managing RAG file uploads.

#### 3. `ConversationHistorySlice.ts` (Sidebar List)
-   **Purpose:** Manages the list of past conversations shown in the sidebar.
-   **Key Actions:**
    -   `fetchConversations`: Calls `/ai/history` to get the list of chats.
    -   `deleteConversationThunk`: Calls `/ai/history/:id` (DELETE) to remove a chat.
    -   `createConversation`: Creates a "New Chat" session manually if needed.
-   **Why:** Separates the *list* of chats from the *active* chat content for cleaner code.

#### 4. `UISlice.ts` (Visual State)
-   **Purpose:** Manages UI-only state like toggling the sidebar or modals.
-   **Why:** Keeps UI logic separate from data logic. For example, opening the specific "Upload Modal" is a UI action, not a data action.

---

## 3. Key Components & Workflow

### A. The Entry Point: `app/layout.tsx` & `AuthWrapper`
-   **Redux Provider:** Wraps the entire app so all components can access the store.
-   **AuthWrapper:**
    -   Runs inside the layout.
    -   Dispatches `checkAuth()` on mount to validate the user's session immediately.
    -   Redirects unauthenticated users to `/login` if they try to access protected routes.

### B. The Main Stage: `ChatPage.tsx` (`app/chat/[[...id]]/page.tsx`)
This is the complex orchestrator where everything comes together.

1.  **URL Handling:**
    -   Uses Next.js `useParams()` to read the conversation ID from the URL (e.g., `/chat/123`).
    -   **Effect:** When the ID changes, it dispatches `fetchMessages(id)` to load that specific chat's history into Redux.
    -   **New Chat:** If no ID exists (`/chat`), it clears the Redux message state to show an empty "New Chat" screen.

2.  **Sending Messages (`handleSend`):**
    -   Collects user input.
    -   Dispatches `sendMessage` Thunk.
    -   **RAG Logic:** If `ragEnabled` is true, it tells the backend "Use RAG for this".
    -   **Redirect:** If it's a "New Chat" (no ID), the backend returns a *new* conversation ID. The page then redirects the browser URL to `/chat/:newId` so the user stays in that session.

3.  **File Upload (`handleFileUpload`):**
    -   Triggered by the hidden `<input type="file">`.
    -   **Constraint:** You can't upload a file to a "non-existent" chat.
    -   **Logic:**
        1.  If currently on "New Chat", it dispatchs `createConversation` *first* to get an ID.
        2.  Then, it dispatches `uploadFile` with that ID.
        3.  Updates the UI with the file name indicator.

### C. The Sidebar: `ConversationSidebar.tsx`
-   **Data Source:** Selects `conversations` from `ConversationHistorySlice`.
-   **Interaction:**
    -   Displays the list of chats.
    -   Clicking a chat navigates via `router.push('/chat/:id')`.
    -   **Deleting:** Clicking the trash icon dispatches `deleteConversationThunk`.
        -   *Crucial Logic:* If you delete the *active* chat, it automatically redirects you to `/chat` (New Chat) to avoid showing a broken page.

### D. Message Display: `MessageContent.tsx`
-   **Purpose:** Renders the raw text from the AI.
-   **Features:**
    -   Uses `react-markdown` to render bold text, lists, and headers.
    -   Uses `remark-gfm` for tables.
    -   Detects code blocks (```javascript ... ```) and renders them with syntax highlighting and a "Copy" button.

---

## 4. Why This Structure?

1.  **Separation of Concerns:**
    -   **Components** handle *Display* and *User Input*.
    -   **Redux Slices** handle *Business Logic* and *State Updates*.
    -   **Axios** handles *Data Transmission*.
    -   **Backend** handles *Data Processing* and *Database*.

2.  **Scalability:**
    -   If you want to add a new feature (e.g., "Voice Input"), you add a thunk to `ChatSlice` and a button to `ChatPage`, without breaking existing authentication or history logic.

3.  **Robustness:**
    -   The centralized Axios interceptor means you never have to worry about manually refreshing tokens in every single component. It "just works" globally.
