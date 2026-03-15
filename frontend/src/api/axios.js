/**
 * Configured Axios instance with base URL, timeout, and JWT auth interceptor.
 * Automatically attaches authorization headers and handles 401 token expiry.
 */
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8000`,
  timeout: 30000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Don't redirect on login attempts — let the login page handle the error
      const isLoginRequest = error.config?.url?.includes('/auth/token');
      const isAlreadyOnLogin = window.location.pathname === '/login';
      if (!isLoginRequest && !isAlreadyOnLogin) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
