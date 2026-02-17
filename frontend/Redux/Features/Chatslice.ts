import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../axiosInstance";


export interface Message {
    role: string;
    content: string;
}

interface ChatState {
    messages: Message[];
    isLoading: boolean;
    isError: boolean;
    error: string;
    model: string;
    currentConversationId: string | null;
    isUploading: boolean;
    uploadedFile: { name: string, id: string } | null;
}

const initialState: ChatState = {
    messages: [],
    isLoading: false,
    isError: false,
    error: "",
    model: 'auto', // Default to auto
    currentConversationId: null,
    isUploading: false,
    uploadedFile: null,
}

// Async Thunk for sending messages
export const sendMessage = createAsyncThunk(
    'chat/sendMessage',
    async ({ message, history, conversationId, model, ragEnabled, webSearch }: {
        message: string,
        history: Message[],
        conversationId: string | null,
        model: string,
        ragEnabled: boolean,
        webSearch: boolean
    }, { rejectWithValue }) => {
        try {
            // If no conversationId, use 'new' as placeholder for the route
            const urlId = conversationId || 'new';

            const response = await axiosInstance.post(
                `/ai/chat/${urlId}`,
                {
                    message,
                    selectedModel: model,
                    conversationId: conversationId, // Send null/undefined if new
                    history: history,
                    useRag: ragEnabled,
                    useWebSearch: webSearch
                }
            );

            return response.data;
        } catch (err: any) {
            return rejectWithValue(err.response?.data || "An error occurred");
        }
    }
);

// Async Thunk for fetching messages
export const fetchMessages = createAsyncThunk(
    'chat/fetchMessages',
    async (conversationId: string, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.get(
                `/ai/chat/${conversationId}`
            );
            return response.data;
        } catch (err: any) {
            return rejectWithValue(err.response?.data || "Failed to fetch messages");
        }
    }
);

// Async Thunk for Uploading File
export const uploadFile = createAsyncThunk(
    'chat/uploadFile',
    async ({ file, conversationId }: { file: File, conversationId: string }, { rejectWithValue }) => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('conversationId', conversationId);

            // Note: axiosInstance automatically sets Content-Type to multipart/form-data when body is FormData
            // BUT sometimes it needs help or we let browser set it with boundary.
            // Safe bet: let axios handle it.
            const response = await axiosInstance.post('/ai/dataset-upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                }
            });
            return response.data;
        } catch (err: any) {
            return rejectWithValue(err.response?.data?.message || "File upload failed");
        }
    }
);

const chatSlice = createSlice({
    name: "chat",
    initialState,
    reducers: {
        addMessage: (state, action: PayloadAction<Message>) => {
            state.messages.push(action.payload)
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload
            if (action.payload) {
                state.error = ""; // Clear error when loading starts
                state.isError = false;
            }
        },
        setError: (state, action: PayloadAction<string>) => {
            state.error = action.payload;
            state.isError = true;
            state.isLoading = false; // Stop loading when error occurs
        },
        setModel: (state, action: PayloadAction<string>) => {
            state.model = action.payload
        },
        setConversationId: (state, action: PayloadAction<string | null>) => {
            state.currentConversationId = action.payload;
        },
        clearMessages: (state) => {
            state.messages = [];
            state.uploadedFile = null;
        },
        clearUploadedFile: (state) => {
            state.uploadedFile = null;
        },
        updateLastMessageContent: (state, action: PayloadAction<string>) => {
            const lastMsgIndex = state.messages.length - 1;
            if (lastMsgIndex >= 0) {
                state.messages[lastMsgIndex].content = action.payload;
            }
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(sendMessage.pending, (state) => {
                state.isLoading = true;
                state.error = "";
                state.isError = false;
            })
            .addCase(sendMessage.fulfilled, (state, action) => {
                state.isLoading = false;

                // Add AI response
                if (action.payload.data) {
                    state.messages.push({
                        role: "assistant",
                        content: action.payload.data.content || "No response content"
                    });
                }

                // Update Conversation ID if it was new
                if (action.payload.conversationId) {
                    state.currentConversationId = action.payload.conversationId;
                }
            })
            .addCase(sendMessage.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.error = (action.payload as any)?.message || "Failed to send message";
            })
            // Fetch Messages
            .addCase(fetchMessages.pending, (state) => {
                state.isLoading = true;
                state.error = "";
                state.isError = false;
                state.messages = []; // Clear current messages while loading
            })
            .addCase(fetchMessages.fulfilled, (state, action) => {
                state.isLoading = false;
                if (action.payload.data) {
                    state.messages = action.payload.data.map((msg: any) => ({
                        role: msg.role,
                        content: msg.content
                    }));
                }
            })
            .addCase(fetchMessages.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.error = (action.payload as any)?.message || "Failed to fetch messages";
            })
            // Upload File
            .addCase(uploadFile.pending, (state) => {
                state.isUploading = true;
                state.error = "";
            })
            .addCase(uploadFile.fulfilled, (state, action) => {
                state.isUploading = false;
                if (action.payload.file) {
                    state.uploadedFile = {
                        name: action.payload.file.originalName,
                        id: action.payload.file._id
                    };
                }
            })
            .addCase(uploadFile.rejected, (state, action) => {
                state.isUploading = false;
                state.isError = true;
                state.error = action.payload as string;
            });
    }
})


export const { addMessage, setLoading, setError, setModel, setConversationId, clearMessages, clearUploadedFile, updateLastMessageContent } = chatSlice.actions

export default chatSlice.reducer