import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshPromise = null;

function clearStoredAuth() {
  localStorage.removeItem('user');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

function redirectToLogin() {
  if (window.location.pathname !== '/login') {
    window.location.replace('/login');
  }
}

function decodeTokenPayload(token) {
  try {
    const encodedPayload = String(token || '').split('.')[1];
    if (!encodedPayload) return null;
    const normalized = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(window.atob(padded));
  } catch {
    return null;
  }
}

function tokenNeedsRefresh(token, leewaySeconds = 30) {
  const expiresAt = Number(decodeTokenPayload(token)?.exp || 0);
  if (!expiresAt) return false;
  return expiresAt <= Math.floor(Date.now() / 1000) + leewaySeconds;
}

async function refreshAccessToken(storedRefreshToken) {
  refreshPromise = refreshPromise || axios.post(`${baseURL}/auth/refresh`, { refreshToken: storedRefreshToken });
  try {
    const response = await refreshPromise;
    const nextAccessToken = response.data?.accessToken;
    const nextRefreshToken = response.data?.refreshToken;
    if (!nextAccessToken) throw new Error('Missing refreshed access token');

    localStorage.setItem('accessToken', nextAccessToken);
    if (nextRefreshToken) localStorage.setItem('refreshToken', nextRefreshToken);
    return nextAccessToken;
  } finally {
    refreshPromise = null;
  }
}

api.interceptors.request.use(async (config) => {
  let token = localStorage.getItem('accessToken');
  const isAuthRequest = config.url?.includes('/auth/login') || config.url?.includes('/auth/refresh');

  if (!isAuthRequest && token && tokenNeedsRefresh(token)) {
    const storedRefreshToken = localStorage.getItem('refreshToken');
    if (storedRefreshToken) {
      try {
        token = await refreshAccessToken(storedRefreshToken);
      } catch (refreshError) {
        clearStoredAuth();
        redirectToLogin();
        return Promise.reject(refreshError);
      }
    }
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (status !== 401 || originalRequest?._retry || originalRequest?.url?.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    const storedRefreshToken = localStorage.getItem('refreshToken');
    if (!storedRefreshToken) {
      clearStoredAuth();
      redirectToLogin();
      return Promise.reject(error);
    }

    try {
      originalRequest._retry = true;
      const nextAccessToken = await refreshAccessToken(storedRefreshToken);

      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      clearStoredAuth();
      redirectToLogin();
      return Promise.reject(refreshError);
    }
  },
);

export default api;
