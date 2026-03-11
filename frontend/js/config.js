// API Configuration
// Use relative path for production (when served by nginx)
// Use absolute URL for local development (when opening HTML file directly)
const API_BASE_URL = window.location.protocol === 'file:'
    ? 'http://localhost:8000/api'  // Development: direct file access
    : '/api';                        // Production: served by nginx

// Storage keys
const STORAGE_KEYS = {
    TOKEN: 'pamsimas_token',
    USER: 'pamsimas_user'
};

// Helper functions
const Config = {
    getApiUrl: (endpoint = '') => {
        return `${API_BASE_URL}${endpoint}`;
    },

    getToken: () => {
        return localStorage.getItem(STORAGE_KEYS.TOKEN);
    },

    setToken: (token) => {
        localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    },

    removeToken: () => {
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
    },

    getUser: () => {
        const user = localStorage.getItem(STORAGE_KEYS.USER);
        return user ? JSON.parse(user) : null;
    },

    setUser: (user) => {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    },

    removeUser: () => {
        localStorage.removeItem(STORAGE_KEYS.USER);
    },

    isAuthenticated: () => {
        return !!Config.getToken();
    },

    logout: () => {
        Config.removeToken();
        Config.removeUser();
        window.location.href = 'index.html';
    }
};
