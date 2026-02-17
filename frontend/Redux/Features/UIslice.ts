import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UiState {
    isSidebarOpen: boolean;
    isUploadModalOpen: boolean;
    theme: 'light' | 'dark' | 'system'; // Optional, if you want Redux to manage theme too
}

const initialState: UiState = {
    isSidebarOpen: false,     // Sidebar starts closed (or true if desktop default)
    isUploadModalOpen: false, // Upload modal hidden
    theme: 'system',
};

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        toggleSidebar: (state) => {
            state.isSidebarOpen = !state.isSidebarOpen;
        },
        setSidebarOpen: (state, action: PayloadAction<boolean>) => {
            state.isSidebarOpen = action.payload;
        },
        toggleUploadModal: (state) => {
            state.isUploadModalOpen = !state.isUploadModalOpen;
        },
        setUploadModalOpen: (state, action: PayloadAction<boolean>) => {
            state.isUploadModalOpen = action.payload;
        },
    },
});

export const {
    toggleSidebar,
    setSidebarOpen,
    toggleUploadModal,
    setUploadModalOpen,
} = uiSlice.actions;

export default uiSlice.reducer;