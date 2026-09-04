import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add interceptor for token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add interceptor for handling 401 responses ONLY on auth endpoints
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || '';
    if (error.response && error.response.status === 401 && requestUrl.includes('/auth/')) {
      console.warn('Unauthorized session detected on auth endpoint (expired/invalid token). Clearing storage.');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  googleLogin: (idToken) => api.post('/auth/google', { idToken }),
  facebookLogin: (idToken) => api.post('/auth/facebook', { idToken }),
  getProfile: () => api.get('/auth/me'),
};

export const friendsAPI = {
  getFriends: () => api.get('/friends'),
  addFriend: (friendId) => api.post('/friends/add', { friendId }),
};

export default api;
