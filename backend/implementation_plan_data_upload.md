# Implementation Plan: Data Upload & Processing Pipeline

## Goal
Implement a secure file upload route that handles various file types (PDF, DOCX, CSV, TXT), stores the original file in ImageKit.io, extracts text using LangChain loaders, splits the text into chunks, generates embeddings, and stores them in MongoDB for RAG.

## key Components

1.  **File Upload (Middleware)**: Use `multer` to handle multipart/form-data requests.
2.  **Storage Service**: Use `imagekit` SDK to upload files to cloud storage for persistence.
3.  **Text Extraction (Service)**: Use LangChain's document loaders to extract raw text based on file type.
4.  **Text Splitting (Service)**: Use `RecursiveCharacterTextSplitter` to chunk text for optimal embedding.
5.  **Embedding & Storage (Service)**: Reuse existing `embedding.service.js` and `EmbeddingModel` to vectorise and save chunks.

## Step 1: Install Dependencies
We need packages for handling files specifically.

```bash
npm install multer imagekit langchain @langchain/community @langchain/core pdf-parse mammoth d3-dsv
```

*   `multer`: File upload handling.
*   `imagekit`: Cloud storage SDK.
*   `langchain`, `@langchain/community`, `@langchain/core`: Core logic and community loaders.
*   `pdf-parse`: For PDF extraction (used by LangChain's `PDFLoader`).
*   `mammoth`: For DOCX extraction (used by LangChain's `DocxLoader`).
*   `d3-dsv`: For CSV parsing (used by LangChain's `CSVLoader`).

## Step 2: Configure Environment (`.env`)
Add ImageKit credentials to `.env`:
```
IMAGEKIT_PUBLIC_KEY=your_public_key
IMAGEKIT_PRIVATE_KEY=your_private_key
IMAGEKIT_URL_ENDPOINT=your_url_endpoint
```

## Step 3: Implementation Architecture

### A. Middleware: `backend/middleware/multer.middleware.js`
Configure multer to store files temporarily in memory or disk (memory is often easier for small/medium files to pass directly to ImageKit).

### B. Service: `backend/services/imagekit.service.js`
Initialize SDK and create an `uploadFile` function.

### C. Service: `backend/utils/fileParser.js` (New Utility)
This utility will handle the text extraction logic using LangChain loaders.

**LangChain Loaders Strategy:**
There isn't one single "magic" package locally for *all* files without external dependencies (like Unstructured API), so we use specific loaders for robustness:
*   **PDF**: `PDFLoader` (from `@langchain/community/document_loaders/fs/pdf`)
*   **DOCX**: `DocxLoader` (from `@langchain/community/document_loaders/fs/docx`)
*   **CSV**: `CSVLoader` (from `@langchain/community/document_loaders/fs/csv`)
*   **TXT/MD**: `TextLoader` (from `langchain/document_loaders/fs/text`)

**Text Splitter Strategy:**
We will use `RecursiveCharacterTextSplitter`.
*   **Chunk Size**: ~1000 characters (good balance for `text-embedding-3-small` which supports 8k tokens, but smaller chunks retrieve better context).
*   **Chunk Overlap**: ~200 characters (to maintain context between chunks).

### D. Controller: `backend/Controllers/FileController.js`
1.  Receive file from request.
2.  Upload to ImageKit -> Get URL/FileID.
3.  Pass buffer/path to `fileParser` to get text chunks.
4.  Loop through chunks -> Generate Embedding -> Save to MongoDB `EmbeddingModel`.
    *   Link chunks to a `FileModel` (optional but recommended to track what files are uploaded).

### E. Routes: `backend/Routes/file.routes.js`
*   `POST /api/files/upload`: Protected route for uploading.

## Step 4: Database Schema Update (Optional)
If you want to manage files (delete them later, list them in UI), we should create a `FileModel.js`.

```javascript
// models/FileModel.js
const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    filename: String,
    url: String, // ImageKit URL
    fileType: String,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // references to embeddings can be implicit via fileId in EmbeddingModel
}, { timestamps: true });

module.exports = mongoose.model('File', fileSchema);
```

## Summary of Workflow
1.  **User** uploads file -> **Multer** catches it.
2.  **Controller** sends to **ImageKit**.
3.  **Controller** sends file buffer to **LangChain Loader**.
4.  **Loader** extracts text -> **Splitter** chunks it.
5.  **Controller** loops chunks -> **Embedding Service** vectorises -> **MongoDB** stores.


## Step 5: Testing with Postman 🚀

Follow these steps to verify your File Ingestion Pipeline is working:

1.  **Start your Backend**:
    *   Make sure your server is running (`npm run dev` or `npx nodemon`).

2.  **Open Postman & Create a new Request**:
    *   **Method**: `POST`
    *   **URL**: `http://localhost:3000/api/ai/dataset-upload` (Adjust port/path if needed)

3.  **Authorization (Important!)**:
    *   Since this route is protected by `AuthMiddleware`, you need to be logged in.
    *   Go to **Headers** tab in Postman.
    *   Key: `Authorization`
    *   Value: `Bearer <YOUR_JWT_TOKEN>` (Get this from a `/login` or `/register` response).

4.  **Body Configuration (The File)**:
    *   Go to **Body** tab.
    *   Select **form-data**.
    *   **Field 1**:
        *   Key: `file`
        *   Type: Select **File** from the dropdown (hover over the key field).
        *   Value: Select a test file from your computer (e.g., specific PDF, CSV, or Text file).
    *   **Field 2**:
        *   Key: `conversationId`
        *   Type: **Text**
        *   Value: `<A_VALID_CONVERSATION_ID_FROM_DB>` (Copy one from MongoDB Compass or a previous response).

5.  **Send Request**:
    *   Click **Send**.

6.  **Expected Response**:
    *   Status: **200 OK**
    *   JSON Body:
        ```json
        {
            "message": "File processed successfully",
            "file": {
                "_id": "...",
                "originalName": "test.pdf",
                "storagePath": "https://ik.imagekit.io/...",
                "mimeType": "application/pdf",
                ...
            },
           
        }
        ```

7.  **Verification**:
    *   **MongoDB**: Check your `files` collection to see the new file record.
    *   **MongoDB**: Check your `embeddings` collection. You should see multiple documents with the same `fileId` and vectors (arrays of numbers).
    *   **ImageKit**: Login to your dashboard and verify the file was uploaded.
