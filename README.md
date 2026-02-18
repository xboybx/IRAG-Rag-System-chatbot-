<p align="center">
  <img src="frontend/public/IRAG logos.png" alt="IRAG Logo" width="120" />
</p>

<h1 align="center">IRAG — Intelligent Retrieval-Augmented Generation Chatbot</h1>

<p align="center">
  <strong>An AI-powered chatbot that combines multiple LLMs with RAG technology and real-time web search to deliver intelligent, context-aware answers from your own documents.</strong>
</p>

<p align="center">
  <a href="https://iragchat.vercel.app">🌐 Live Demo</a> •
  <a href="#features">✨ Features</a> •
  <a href="#how-rag-works">🧠 How RAG Works</a> •
  <a href="#tech-stack">🛠️ Tech Stack</a> •
  <a href="#getting-started">🚀 Getting Started</a>
</p>

---

## 📖 What is IRAG?

**IRAG** (Intelligent RAG) is a full-stack AI chatbot application that goes beyond simple question-and-answer interactions. It uses **Retrieval-Augmented Generation (RAG)** to let users upload their own documents (PDFs, Word files, spreadsheets, CSVs, text files) and then ask questions about them — getting accurate, context-grounded answers powered by AI.

Think of it as having a personal research assistant that has actually *read* your documents and can answer questions about them, cite relevant sections, and combine that knowledge with its general understanding of the world.

---

## ❓ Why IRAG?

Traditional chatbots only know what they were trained on. They can't read your files, they hallucinate facts, and they have no memory of your previous conversations.

**IRAG solves this by:**

| Problem | IRAG's Solution |
|---|---|
| AI doesn't know your data | **Upload documents** — IRAG reads, chunks, and indexes them |
| AI hallucinates answers | **RAG retrieval** — answers are grounded in your actual documents |
| AI knowledge is outdated | **Web Search** — fetches real-time information from the internet |
| AI forgets context | **Conversation memory** — maintains context with smart summarization |
| Single model limitations | **Multi-model fallback** — round-robin across multiple free AI models |
| Slow responses | **Streaming** — real-time typewriter-style response rendering |

---

## ✨ Features

### 🤖 AI & RAG Core
- **Multi-Model Support** — Uses OpenRouter to access multiple AI models (Solar Pro 3, Arcee Trinity, LFM 2.5) with automatic round-robin fallback
- **RAG Document Q&A** — Upload documents and ask questions about them with vector-similarity-based context retrieval
- **Web Search Integration** — Powered by Tavily API for real-time web search (manual or auto-triggered)
- **Streaming Responses** — Real-time typewriter-style response delivery via chunked transfer encoding
- **Conversation Memory** — Smart context management with automatic history summarization for long conversations
- **Context-Aware Answers** — Combines document context + web search results + conversation history for comprehensive answers

### 📄 Document Processing
- **Multi-Format Support** — PDF, DOCX (Word), XLSX (Excel), CSV, TXT, and JSON
- **Intelligent Chunking** — Uses LangChain's `RecursiveCharacterTextSplitter` with 1000 character chunks and 200 character overlap
- **Vector Embeddings** — Generates embeddings using OpenAI's `text-embedding-3-small` model
- **MongoDB Atlas Vector Search** — Stores and queries embeddings using native MongoDB vector search
- **Cloud Storage** — Files are stored on ImageKit CDN for fast, reliable access

### 🔐 Authentication & Security
- **JWT-Based Auth** — Dual token strategy with short-lived access tokens and HTTP-only refresh token cookies
- **Secure Cookies** — SameSite=None, Secure, HTTP-only cookies for cross-domain auth
- **Token Auto-Refresh** — Seamless token refresh via Axios interceptors
- **Protected Routes** — Middleware-based route protection on the backend

### 🎨 Frontend Experience
- **Modern UI** — Glassmorphism design with smooth animations and responsive layouts
- **Dark Mode** — Full dark mode support via `next-themes`
- **Mobile Responsive** — Fully responsive across all device sizes
- **Conversation Sidebar** — Manage, switch, and delete conversations
- **Engaging Loading Screen** — Animated card-stack loader showcasing app features while the backend wakes up
- **Redux State Management** — Centralized state with Redux Toolkit for auth, chat, conversations, and UI
- **Markdown Rendering** — AI responses rendered with full Markdown support including syntax highlighting

---

## 🧠 How RAG Works

RAG (Retrieval-Augmented Generation) is the core technology that makes IRAG special. Here's how it works step by step:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        RAG PIPELINE                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  📄 DOCUMENT UPLOAD PHASE                                           │
│  ┌──────────┐    ┌──────────┐    ┌───────────┐    ┌─────────────┐  │
│  │  Upload   │───▶│  Parse   │───▶│  Chunk    │───▶│  Embed &    │  │
│  │  File     │    │  Text    │    │  Text     │    │  Store      │  │
│  │(PDF/DOCX) │    │(mammoth, │    │(LangChain │    │(MongoDB     │  │
│  │           │    │ pdf-parse│    │ 1000 char │    │ Atlas +     │  │
│  │           │    │ xlsx)    │    │ + 200     │    │ Vector      │  │
│  │           │    │          │    │ overlap)  │    │ Index)      │  │
│  └──────────┘    └──────────┘    └───────────┘    └─────────────┘  │
│                                                                     │
│  💬 QUERY PHASE                                                     │
│  ┌──────────┐    ┌──────────┐    ┌───────────┐    ┌─────────────┐  │
│  │  User     │───▶│  Embed   │───▶│  Vector   │───▶│  Inject     │  │
│  │  Asks     │    │  Query   │    │  Search   │    │  Context    │  │
│  │  Question │    │          │    │  (cosine  │    │  into AI    │  │
│  │           │    │          │    │  similar- │    │  Prompt     │  │
│  │           │    │          │    │  ity)     │    │             │  │
│  └──────────┘    └──────────┘    └───────────┘    └─────────────┘  │
│                                         │                           │
│                                         ▼                           │
│                              Score > 0.35?                          │
│                              ┌────┐  ┌────┐                         │
│                              │ YES│  │ NO │                         │
│                              └──┬─┘  └──┬─┘                         │
│                                 │       │                           │
│                          Use RAG    Normal AI                       │
│                          Context    Response                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Step-by-Step

1. **Upload** — User uploads a document (PDF, DOCX, XLSX, CSV, TXT, JSON)
2. **Parse** — The server extracts raw text from the file using specialized parsers (`pdf-parse`, `mammoth`, `xlsx`, `d3-dsv`)
3. **Chunk** — Text is split into overlapping chunks of ~1000 characters using LangChain's `RecursiveCharacterTextSplitter`
4. **Embed** — Each chunk is converted into a 1536-dimensional vector using OpenAI's `text-embedding-3-small` model
5. **Store** — Vectors are stored in MongoDB Atlas with a Vector Search Index
6. **Query** — When the user asks a question, their query is also converted into a vector
7. **Search** — MongoDB Atlas Vector Search finds the top 3 most similar chunks (cosine similarity)
8. **Threshold** — Only chunks with a similarity score > 0.35 are considered relevant
9. **Inject** — Relevant chunks are injected into the AI prompt as system context
10. **Generate** — The AI generates an answer grounded in the retrieved document context

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **Next.js 16** | React framework with App Router, SSR, and API rewrites |
| **TypeScript** | Type-safe frontend development |
| **Redux Toolkit** | Global state management (auth, chat, conversations, UI) |
| **Tailwind CSS v4** | Utility-first styling with custom design tokens |
| **Shadcn/UI** | Pre-built accessible UI components |
| **React Markdown** | Rendering AI responses with full Markdown + syntax highlighting |
| **Lucide React** | Beautiful, consistent iconography |

### Backend
| Technology | Purpose |
|---|---|
| **Node.js + Express 5** | REST API server |
| **MongoDB + Mongoose** | Database with Vector Search for RAG |
| **OpenRouter API** | Multi-model AI gateway (Solar Pro 3, Arcee Trinity, etc.) |
| **OpenAI SDK** | Embeddings generation (`text-embedding-3-small`) |
| **Tavily API** | Real-time web search integration |
| **LangChain** | Document parsing and text splitting |
| **ImageKit** | Cloud file storage CDN |
| **JWT + bcrypt** | Authentication and password hashing |
| **Multer** | File upload handling (in-memory buffer) |

### Infrastructure
| Service | Purpose |
|---|---|
| **Vercel** | Frontend hosting |
| **Render** | Backend hosting (free tier) |
| **MongoDB Atlas** | Cloud database with Vector Search |
| **ImageKit** | File/image CDN |

---

## 📁 Project Structure

```
IRAG/
├── backend/
│   ├── Controllers/
│   │   ├── AIcontroller.js          # Chat, upload, conversations, messages
│   │   └── UserController.js        # Register, login, logout, refresh, profile
│   ├── Middleware/
│   │   ├── AuthMiddlware.js         # JWT verification middleware
│   │   └── multer.middleware.js      # File upload handling (memory storage)
│   ├── Routes/
│   │   ├── ai.Routes.js             # /ai/* routes
│   │   └── auth.routes.js           # /user/* routes
│   ├── models/
│   │   ├── ConversationModel.js     # Conversation schema (title, files, model)
│   │   ├── MessageModel.js          # Message schema (with RAG citations, feedback)
│   │   ├── EmbeddingModel.js        # Vector embedding schema
│   │   ├── FileModel.js             # Uploaded file metadata
│   │   └── UserModel.js             # User schema with hashed passwords
│   ├── services/
│   │   ├── ai.service.js            # Multi-model AI with round-robin fallback
│   │   ├── rag.service.js           # RAG: vector search + context injection
│   │   ├── embedding.service.js     # Embedding generation for chunks & queries
│   │   ├── webSearch.service.js     # Tavily web search integration
│   │   └── imagekit.service.js      # ImageKit file upload
│   ├── utils/
│   │   ├── ChatContext.js           # Fetch conversation context from DB
│   │   ├── FileParser.js            # Multi-format file text extraction
│   │   └── systemPrompt.js          # AI system prompt
│   └── app.js                       # Express server entry point
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx                 # Landing page (home)
│   │   ├── layout.tsx               # Root layout with providers
│   │   ├── chat/[[...id]]/page.tsx  # Main chat interface
│   │   ├── login/page.tsx           # Login page
│   │   ├── register/page.tsx        # Registration page
│   │   └── profile/page.tsx         # User profile page
│   ├── components/
│   │   ├── AppLoader.tsx            # Animated card-stack loading screen
│   │   ├── AuthWrapper.tsx          # Auth check + route protection
│   │   ├── ConversationSidebar.tsx  # Sidebar with conversation history
│   │   └── MessageContent.tsx       # Markdown message renderer
│   ├── Redux/
│   │   ├── Features/
│   │   │   ├── Chatslice.ts         # Chat messages state
│   │   │   ├── ConversationHistorySlice.ts # Conversation list state
│   │   │   ├── UIslice.ts           # Sidebar, modals UI state
│   │   │   └── UserSlice.ts         # Auth state (login, register, refresh)
│   │   ├── Store.ts                 # Redux store configuration
│   │   ├── axiosInstance.ts         # Axios with token refresh interceptor
│   │   └── hooks.ts                 # Typed Redux hooks
│   └── next.config.ts               # API rewrites to backend
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+
- **MongoDB Atlas** account (with Vector Search index configured)
- **OpenRouter** API key (free tier available)
- **ImageKit** account (for file storage)
- **Tavily** API key (for web search, optional)

### 1. Clone the Repository

```bash
git clone https://github.com/xboybx/IRAG-Rag-System-chatbot-.git
cd IRAG-Rag-System-chatbot-
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:

```env
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret_key
JWT_REFRESH_SECRET=your_refresh_token_secret
OPEN_ROUTER_API_KEY=your_openrouter_api_key
IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key
IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
IMAGEKIT_URL_ENDPOINT=your_imagekit_url_endpoint
TAVILY_API_KEY=your_tavily_api_key
FRONTEND_URL=http://localhost:3000
SITE_URL=http://localhost:3000
SITE_NAME=IRAG
```

Start the backend:

```bash
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend/` directory:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```

Start the frontend:

```bash
npm run dev
```

### 4. MongoDB Atlas Vector Search Index

You **must** create a Vector Search Index on the `embeddings` collection in MongoDB Atlas for the RAG functionality to work.

**Index Configuration:**

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1536,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "fileId"
    }
  ]
}
```

Name the index: `vector_index`

---

## 🔌 API Reference

### Auth Routes (`/user`)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/user/register` | Register new user | ❌ |
| `POST` | `/user/login` | Login user | ❌ |
| `POST` | `/user/logout` | Logout user | ✅ |
| `GET` | `/user/me` | Get current user profile | ✅ |
| `POST` | `/user/refresh` | Refresh access token | ❌ (uses cookie) |

### AI Routes (`/ai`)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/ai/chat/:conversationId` | Send message (streaming) | ✅ |
| `POST` | `/ai/create-conversation` | Create new conversation | ✅ |
| `POST` | `/ai/dataset-upload` | Upload document for RAG | ✅ |
| `GET` | `/ai/history` | Get all conversations | ✅ |
| `DELETE` | `/ai/history/:conversationId` | Delete conversation | ✅ |
| `GET` | `/ai/chat/:conversationId` | Get messages for conversation | ✅ |

---

## 📄 Supported File Formats

| Format | Extension | Parser Used |
|---|---|---|
| PDF | `.pdf` | LangChain `PDFLoader` |
| Word Document | `.docx` | `mammoth` |
| Excel Spreadsheet | `.xlsx` | `xlsx` (SheetJS) |
| CSV | `.csv` | `d3-dsv` |
| Plain Text | `.txt` | Native `Buffer.toString()` |
| JSON | `.json` | Native `Buffer.toString()` |

---

## 🤖 AI Models

IRAG uses **OpenRouter** as a gateway to access multiple free AI models:

| Model | ID | Mode |
|---|---|---|
| Solar Pro 3 | `upstage/solar-pro-3:free` | Auto / Manual |
| Arcee Trinity Large | `arcee-ai/trinity-large-preview:free` | Auto / Manual |
| LFM 2.5 1.2B Thinking | `liquid/lfm-2.5-1.2b-thinking:free` | Auto / Manual |

- **Auto Mode**: Round-robin across all available models with automatic fallback
- **Manual Mode**: Select a specific model from the dropdown

---

## 🌐 Deployment

| Component | Platform | URL |
|---|---|---|
| Frontend | Vercel | [iragchat.vercel.app](https://iragchat.vercel.app) |
| Backend | Render (Free Tier) | Configured via `NEXT_PUBLIC_BACKEND_URL` |
| Database | MongoDB Atlas | Cloud-hosted with Vector Search |
| File Storage | ImageKit | CDN-backed file delivery |

> **Note:** The backend is hosted on Render's free tier, which spins down after inactivity. The first request may take 30-60 seconds while the server wakes up. The app includes a backend wake-up mechanism and an engaging loading screen to handle this gracefully.

---

## 👨‍💻 Developer

Built with ❤️ by **Jaswanth**

---

## 📝 License

This project is for educational and portfolio purposes.
