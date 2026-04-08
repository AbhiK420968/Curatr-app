import axios from 'axios';
import { supabase } from './supabase';
import { API_BASE_URL } from '@/constants';

// Axios instance configured for the backend API
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor — attach Supabase JWT to every request
api.interceptors.request.use(
    async (config) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
            config.headers.Authorization = `Bearer ${session.access_token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor — handle errors globally
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid — could trigger re-auth
            console.warn('Unauthorized — session may have expired');
        }
        return Promise.reject(error);
    }
);

export default api;
