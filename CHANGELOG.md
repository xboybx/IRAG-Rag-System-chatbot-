# 📜 IRAG Changelog & Project Development History

This document tracks all recent visual updates, bug fixes, performance optimizations, and architectural enhancements applied to the IRAG chatbot system. It serves as a living developer knowledge base.

---

## 🚀 Recent Improvements (June 2026)

### 🎨 Visual & Theme Polish (Frontend UI)
- **Grey/Zinc Dark Theme Harmony**:
  - Replaced the blue/slate base background in dark mode with a neutral charcoal-black base (`bg-zinc-950`).
  - Swapped out the colorful indigo/pink background glowing blobs in dark mode with visible **metallic silver/white gradients** (`zinc-400`, `zinc-500`, and `zinc-300`) fading to `transparent` at `10%` to `15%` opacity for a high-end, visual glowing effect.
  - Updated the sidebar background color to `dark:bg-zinc-900/30` to perfectly match the neutral-grey theme grid.
  - Implemented the metallic/silver gradients for the **input container hover glow** (`dark:from-zinc-400/20 dark:via-zinc-500/20 dark:to-zinc-300/20`) to replace the colorful pink/purple shadows on focus/hover in dark mode.
- **Header Contrast Updates**:
  - Enabled pure white color formatting for the main **IRAG** brand text element (`dark:text-white`) and the **User profile icon** dropdown button (`dark:text-white` with hover effects) in dark mode for optimal contrast.
- **Refined Corner Roundness & Borders**:
  - Adjusted the main Chat Area's border-radius from `rounded-[12px] md:rounded-[20px]` to `rounded-[6px] md:rounded-[8px]` (later adjusted by user to `rounded-lg md:rounded-[30px]`).
  - Removed the border outline and ring styling (`dark:border-0 dark:ring-0`) for the main Chat Area container in dark mode to present a modern, completely borderless pane look.
- **Message Bubble & Sidebar Layout**:
  - Removed padding within the user message bubble (`px-6 py-2` instead of responsive `px`/`py` paddings) to bring the user's text closer to the borders.
  - Resolved horizontal delete button overflow in the sidebar chats history list by absolutely positioning the trash button (`absolute right-2 top-1/2 -translate-y-1/2`) and adding padding (`pr-6`) to the text block container.
  - Expanded the sidebar container width from `w-64` to `w-72` across [page.tsx](file:///d:/Dev%20Workspace/RagSystem/frontend/app/chat/%5B%5B...id%5D%5D/page.tsx) and [ConversationSidebar.tsx](file:///d:/Dev%20Workspace/RagSystem/frontend/components/ConversationSidebar.tsx) to provide more text width buffer.
- **Floating Popover Upload Menu**:
  - Replaced the full-screen overlay upload modal with a modern, compact floating dropdown menu attached directly to the Plus (`+`) button using a custom `DropdownMenuContent` component.
- **Developer Info Popover**:
  - Added a very small, unhighlighted Lucide `Info` button in the header right next to the WEB search toggle. It opens a clean, localized floating popover dropdown detailing the developer profile (Jaswanth) and links to their GitHub profile (`github.com/xboybx`) without triggering a full-screen overlay modal.
- **Material 3 Bouncing Dots Wave Loader**:
  - Replaced the typewriter-based loading text animation with a minimal, elegant 3-dots wave bounce loader.
  - Styled the dots at a small size (`w-1.5 h-1.5`) and made them adaptive (`bg-black dark:bg-white`) without background containers or shadows.
- **Light Theme Background Adjustments**:
  - Updated base background classes to use a warm, soft paper off-white (`#faf9f6` base instead of harsh high-glare white) to prevent eye strain during nocturnal light-mode use.

### 🛡️ Production & Backend Bug Fixes
- **Cloudflare 403 WAF Bypass**:
  - Resolved `403 Forbidden` API errors from `api.clod.io` in [ai.service.js](file:///d:/Dev%20Workspace/RagSystem/backend/services/ai.service.js) and [embedding.service.js](file:///d:/Dev%20Workspace/RagSystem/backend/services/embedding.service.js).
  - Sanitized outgoing header payloads to dynamically strip out `undefined` values (e.g. `HTTP-Referer` and `X-Title` stringifying as `"undefined"`), which triggered strict WAF rule blocks.
  - Appended standard browser `User-Agent` headers to both client initialization calls to prevent bot-detection flags.
- **Fix Chat 500 Internal Server Errors & Mongoose CastErrors**:
  - Corrected `ConversationModel.findById` with a query object to `ConversationModel.findOne` in [ChatContext.js](file:///d:/Dev%20Workspace/RagSystem/backend/utils/ChatContext.js) to resolve Mongoose CastError crashes.
  - Removed the broken `.sort({ createdAt: -1 }).lmit(5)` method chain on the async result of `getChatContext(...)` in [AIcontroller.js](file:///d:/Dev%20Workspace/RagSystem/backend/Controllers/AIcontroller.js).
  - Ensured `getChatContext` returns safe `[]` arrays when missing records, preventing subsequent array operations from raising TypeError crashes in the Express handler.
  - Corrected the `findByIdAndUpdate` parameter call in `DatasetUploadController` to pass the conversation ID directly as a string instead of an object.
- **Dynamic Model Selector Endpoint & Frontend Binding**:
  - Added a new `GET /ai/models` route in [ai.Routes.js](file:///d:/Dev%20Workspace/RagSystem/backend/Routes/ai.Routes.js) to dynamically fetch active models mapped on the backend.
  - Implemented Redux thunk `fetchAvailableModels` and stored list state inside [Chatslice.ts](file:///d:/Dev%20Workspace/RagSystem/frontend/Redux/Features/Chatslice.ts).
  - Updated the frontend [page.tsx](file:///d:/Dev%20Workspace/RagSystem/frontend/app/chat/%5B%5B...id%5D%5D/page.tsx) dropdown selector to fetch and render model choices dynamically and submit the chosen keys directly without hardcoded mappings.

---

## 🧠 Core System Knowledge Base & Architectural Decisions

### 1. Vector Search Pipeline (RAG)
- **Embedding model**: OpenAI's `text-embedding-3-small` (1536 dimensions).
- **Storage & Search**: MongoDB Atlas Vector Search Index.
- **Threshold**: Similarity cosine score cutoff at `0.35` to ensure contextual relevance and eliminate hallucinated text injection.

### 2. Streaming AI Controller
- **Protocol**: Chunked HTTP transfer encoding (`Transfer-Encoding: chunked`) to stream responses in real-time to the browser without proxy buffering.
- **State Management**: Local React variables capture active buffer streams to prevent Redux update overhead jitter, committing final results to Redux only upon stream completion.

### 3. JWT & Cookies Security
- **Auth Strategy**: Dual token authorization with short-lived JWTs passed in headers and HTTP-only SameSite cookies handling token refresh operations automatically via client interceptors.
