import { createSlice, PayloadAction } from "@reduxjs/toolkit"

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
}

const conversationsHistory = createSlice({
    name: "conversationsHistory",
    initialState,
    reducers: {
        setConversations: (state, action: PayloadAction<Conversation[]>) => {
            state.conversations = action.payload
        },
        addConversation: (state, action: PayloadAction<Conversation>) => {
            state.conversations.push(action.payload)
        },
        deleteConversation: (state, action: PayloadAction<string>) => {
            state.conversations = state.conversations.filter((conversation) => conversation.id !== action.payload)
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
            if (action.payload) {
                state.error = "";
                state.isError = false;
            }
        },
        setError: (state, action: PayloadAction<string>) => {
            state.error = action.payload;
            state.isError = true;
            state.isLoading = false;
        }
    }
})

export const { setConversations, addConversation, deleteConversation, setLoading, setError } = conversationsHistory.actions

export default conversationsHistory.reducer
