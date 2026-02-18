import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axiosInstance from "../axiosInstance";

export interface Conversation {
    id: string;
    title: string;
    timestamp: string;
}

interface HistoryState {
    conversations: Conversation[];
    isLoading: boolean;
    isError: boolean;
    error: string;
}

const initialState: HistoryState = {
    conversations: [],
    isLoading: false,
    isError: false,
    error: "",
};

// --- Async Thunks ---

// Fetch Conversations
export const fetchConversations = createAsyncThunk(
    "conversationsHistory/fetchConversations",
    async (_, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.get(`/ai/history`);
            // Map backend data to frontend interface
            return response.data.data.map((conv: any) => ({
                id: conv._id,
                title: conv.title,
                timestamp: new Date(conv.createdAt).toLocaleDateString(), // Format as needed
            }));
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Failed to fetch history");
        }
    }
);

// Delete Conversation
export const deleteConversationThunk = createAsyncThunk(
    "conversationsHistory/deleteConversation",
    async (conversationId: string, { rejectWithValue }) => {
        try {
            await axiosInstance.delete(`/ai/history/${conversationId}`);
            return conversationId;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Failed to delete conversation");
        }
    }
);

// Create Conversation Thunk
export const createConversation = createAsyncThunk(
    "conversationsHistory/createConversation",
    async (title: string, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.post(`/ai/create-conversation`, { title });
            return {
                id: response.data.data._id,
                title: response.data.data.title,
                timestamp: new Date(response.data.data.createdAt).toLocaleDateString()
            };
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Failed to create conversation");
        }
    }
);

const conversationsHistory = createSlice({
    name: "conversationsHistory",
    initialState,
    reducers: {
        addConversation: (state, action: PayloadAction<Conversation>) => {
            state.conversations.unshift(action.payload); // Add to beginning
        },
        clearHistory: (state) => {
            state.conversations = [];
        }
    },
    extraReducers: (builder) => {
        // Fetch Conversations
        builder.addCase(fetchConversations.pending, (state) => {
            state.isLoading = true;
            state.isError = false;
        });
        builder.addCase(fetchConversations.fulfilled, (state, action) => {
            state.isLoading = false;
            state.conversations = action.payload;
        });
        builder.addCase(fetchConversations.rejected, (state, action) => {
            state.isLoading = false;
            state.isError = true;
            state.error = action.payload as string;
        });

        // Delete Conversation
        builder.addCase(deleteConversationThunk.fulfilled, (state, action) => {
            state.conversations = state.conversations.filter((c) => c.id !== action.payload);
        });

        // Create Conversation
        builder.addCase(createConversation.fulfilled, (state, action) => {
            state.conversations.unshift(action.payload);
        });
    },
});

export const { addConversation, clearHistory } = conversationsHistory.actions;
export default conversationsHistory.reducer;
