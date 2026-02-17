import { configureStore } from "@reduxjs/toolkit"
import chatReducer from "./Features/Chatslice"
import conversationsHistoryReducer from "./Features/ConversationHistorySlice"
import uiReducer from "./Features/UIslice"
import authReducer from "./Features/UserSlice"
import { setupInterceptors } from "./axiosInstance"

export const store = configureStore({
    reducer: {
        chat: chatReducer,
        conversationsHistory: conversationsHistoryReducer,
        ui: uiReducer,
        auth: authReducer
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false,
        }),
})

setupInterceptors(store);

export type AppStore = typeof store
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
