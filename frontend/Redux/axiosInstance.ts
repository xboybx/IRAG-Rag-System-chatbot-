import axios from 'axios';
import { setToken, logoutUser } from './Features/UserSlice';



const axiosInstance = axios.create({
    baseURL: '/api', // Proxy through Next.js
    withCredentials: true, // Important for cookies (Refresh Token)
    headers: {
        'Content-Type': 'application/json',

    },
    timeout: 20000, // 20 seconds timeout (increased for slow cold starts)
});

export const setupInterceptors = (store: any) => {
    // Request Interceptor: Attach Access Token
    axiosInstance.interceptors.request.use(
        (config) => {
            const state = store.getState();
            const token = state.auth.token;

            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        },
        (error) => Promise.reject(error)
    );

    // Response Interceptor: Handle Token Refresh
    axiosInstance.interceptors.response.use(
        (response) => response,
        async (error) => {
            const originalRequest = error.config;

            // If 401 Unauthorized and we haven't tried refreshing yet
            if (error.response?.status === 401 && !originalRequest._retry) {
                originalRequest._retry = true;

                try {
                    // Attempt to refresh the token using the HttpOnly cookie
                    const refreshResponse = await axios.post(
                        `/api/user/refresh`,
                        {},
                        { withCredentials: true }
                    );

                    const newToken = refreshResponse.data.short_lived_Token;

                    if (newToken) {
                        // Update Redux state with new token
                        store.dispatch(setToken(newToken));

                        // Retry original request with new token
                        originalRequest.headers.Authorization = `Bearer ${newToken}`;
                        return axiosInstance(originalRequest);
                    }
                } catch (refreshError) {
                    // If refresh fails, logout user
                    store.dispatch(logoutUser());
                    return Promise.reject(refreshError);
                }
            }

            return Promise.reject(error);
        }
    );
};

export default axiosInstance;
