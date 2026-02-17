import { configureStore } from "@reduxjs/toolkit"
import chatReducer from "./Features/Chatslice"
import conversationsHistoryReducer from "./Features/ConversationHistorySlice"
import uiReducer from "./Features/UIslice"

export const store = configureStore({
    reducer: {
        chat: chatReducer,
        conversationsHistory: conversationsHistoryReducer,
        ui: uiReducer
    }
})

// Infer the type of makeStore
export type AppStore = typeof store
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch