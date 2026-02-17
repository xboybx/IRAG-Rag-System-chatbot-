import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import axios from "axios";
import axiosInstance from "../axiosInstance";

// Define User Interface
export interface User {
    _id: string;
    name: string;
    email: string;
}

// Define Auth State Interface
interface AuthState {
    user: User | null;
    token: string | null; // Access Token (Short Lived)
    isAuthenticated: boolean;
    isLoading: boolean;
    isError: boolean;
    errorMessage: string;
}

const initialState: AuthState = {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    isError: false,
    errorMessage: "",
};


const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

// --- Async Thunks ---

// Register User
export const registerUser = createAsyncThunk(
    "auth/registerUser",
    async (userData: any, { rejectWithValue }) => {
        try {
            const response = await axios.post(`${API_URL}/user/register`, userData, { withCredentials: true });
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Registration failed");
        }
    }
);

// Login User
export const loginUser = createAsyncThunk(
    "auth/loginUser",
    async (userData: any, { rejectWithValue }) => {
        try {
            const response = await axios.post(`${API_URL}/user/login`, userData, { withCredentials: true });
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Login failed");
        }
    }
);

// Logout User
export const logoutUser = createAsyncThunk(
    "auth/logoutUser",
    async (_, { rejectWithValue }) => {
        try {
            await axiosInstance.post(`/user/logout`);
            return true;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Logout failed");
        }
    }
);

// Check Auth (Get Current User / Refresh)
// This calls /user/me to get the user based on the cookie/token
export const checkAuth = createAsyncThunk(
    "auth/checkAuth",
    async (_, { rejectWithValue }) => {
        try {
            // axiosInstance interceptors handle token attachment and refreshing automatically
            const response = await axiosInstance.get(`/user/me`);
            return response.data;
        } catch (error: any) {
            return rejectWithValue("Session expired");
        }
    }
);

const userSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        clearError: (state) => {
            state.isError = false;
            state.errorMessage = "";
        },
        // Manually set token if needed (e.g. from local storage if we used that)
        setToken: (state, action: PayloadAction<string>) => {
            state.token = action.payload;
        }
    },
    extraReducers: (builder) => {
        // Register
        builder.addCase(registerUser.pending, (state) => {
            state.isLoading = true;
            state.isError = false;
        });
        builder.addCase(registerUser.fulfilled, (state, action) => {
            state.isLoading = false;
            state.user = action.payload.user;
            state.token = action.payload.short_lived_Token;
            state.isAuthenticated = true;

        });
        builder.addCase(registerUser.rejected, (state, action) => {
            state.isLoading = false;
            state.isError = true;
            state.errorMessage = action.payload as string;
        });

        // Login
        builder.addCase(loginUser.pending, (state) => {
            state.isLoading = true;
            state.isError = false;
        });
        builder.addCase(loginUser.fulfilled, (state, action) => {
            state.isLoading = false;
            state.user = action.payload.user;
            state.token = action.payload.short_lived_Token;
            state.isAuthenticated = true;
        });
        builder.addCase(loginUser.rejected, (state, action) => {
            state.isLoading = false;
            state.isError = true;
            state.errorMessage = action.payload as string;
        });

        // Logout
        builder.addCase(logoutUser.fulfilled, (state) => {
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
        });

        // Check Auth
        builder.addCase(checkAuth.pending, (state) => {
            state.isLoading = true;
        });
        builder.addCase(checkAuth.fulfilled, (state, action) => {
            state.isLoading = false;
            state.user = action.payload.user;
            if (action.payload.short_lived_Token) {
                state.token = action.payload.short_lived_Token;
            }
            state.isAuthenticated = true;
        });
        builder.addCase(checkAuth.rejected, (state) => {
            state.isLoading = false;
            state.isAuthenticated = false;
            state.user = null;
            state.token = null;
        });
    },
});

export const { clearError, setToken } = userSlice.actions;
export default userSlice.reducer;
