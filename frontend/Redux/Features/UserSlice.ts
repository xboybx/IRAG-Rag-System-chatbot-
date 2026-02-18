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
// This first tries to refresh the token, then gets the user
export const checkAuth = createAsyncThunk(
    "auth/checkAuth",
    async (_, { rejectWithValue }) => {
        try {
            // First, try to refresh the token using the HttpOnly cookie
            const refreshResponse = await axios.post(
                `${API_URL}/user/refresh`,
                {},
                { withCredentials: true }
            );

            const newToken = refreshResponse.data.short_lived_Token;
            const user = refreshResponse.data.user;

            return {
                user,
                short_lived_Token: newToken
            };
        } catch (error: any) {
            if (axios.isAxiosError(error)) {
                // 400 or 401 means no valid session token was found (user is a guest)
                if (error.response?.status === 400 || error.response?.status === 401) {
                    return rejectWithValue("No active session");
                }
                return rejectWithValue(error.response?.data?.message || "Session check failed");
            }
            return rejectWithValue("Session check failed");
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

        // Fetch Current User
        builder.addCase(fetchCurrentUser.pending, (state) => {
            state.isLoading = true;
        });
        builder.addCase(fetchCurrentUser.fulfilled, (state, action) => {
            state.isLoading = false;
            state.user = action.payload.user;
            state.isAuthenticated = true;
        });
        builder.addCase(fetchCurrentUser.rejected, (state, action) => {
            state.isLoading = false;
            state.isError = true;
            state.errorMessage = action.payload as string;
        });
    },
});

// Fetch Current User (Directly from /me)
export const fetchCurrentUser = createAsyncThunk(
    "auth/fetchCurrentUser",
    async (_, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.get(`/user/me`);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || "Failed to fetch user data");
        }
    }
);

export const { clearError, setToken } = userSlice.actions;
export default userSlice.reducer;
