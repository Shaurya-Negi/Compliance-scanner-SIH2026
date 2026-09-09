/**
 * Axios API client instance with JWT authorization interceptor
 */
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 30000, // 30s timeout for OCR + LLM pipeline
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sih_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token expired or invalid - clear local storage
      localStorage.removeItem('sih_access_token');
      localStorage.removeItem('sih_user');
      // If on a protected route, could redirect to login
    }
    return Promise.reject(error);
  }
);

export default api;
