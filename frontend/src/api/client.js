import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Expired or invalid token: clear the session and send the user back to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isAuthCall = err.config?.url?.startsWith('/auth/');
    if (err.response?.status === 401 && !isAuthCall) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export function getUser() {
  return JSON.parse(localStorage.getItem('user') || '{}');
}

export function saveSession(token, user) {
  if (token) localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

export function isOwner() {
  return getUser().role === 'owner';
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

export default api;

export const canViewProfit = (user) => {
  return user?.role === 'owner' || user?.role === 'manager';
};

export const isStaff = (user) => {
  return user?.role === 'staff';
};

export function homePath(user = getUser()) {
  if (user?.role === 'staff') return '/outlets';
  if (user?.role === 'manager') return '/dashboard';
  if (user?.role === 'owner') return '/dashboard';
  return '/login';
}