import { createSlice, PayloadAction } from "@reduxjs/toolkit";

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
}

const initialState: ChatState = {
    messages: [],
    isLoading: false,
    isError: false,
    error: "",
    model: 'auto', // Default to auto
    currentConversationId: null,
}

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
        }
    }
})

export const { addMessage, setLoading, setError, setModel, setConversationId, clearMessages } = chatSlice.actions

export default chatSlice.reducer