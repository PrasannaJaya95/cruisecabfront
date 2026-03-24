import axios from 'axios';

function computeDefaultApiBaseUrl() {
    // If the frontend is opened via LAN IP (e.g. http://192.168.x.x:5175),
    // using localhost would point to the *client device*, not the server.
    // So default to the same hostname as the current page.
    if (typeof window !== 'undefined' && window.location?.hostname) {
        return `http://${window.location.hostname}:5000/api`;
    }
    return 'http://localhost:5000/api';
}

const api = axios.create({
    baseURL: (import.meta.env.VITE_API_URL || computeDefaultApiBaseUrl()).replace(/\/?$/, '/'),
    timeout: 30000,
});

export function getServerOrigin() {
    try {
        // baseURL includes "/api/", but we only need the origin for assets like "/uploads/..."
        return new URL(api.defaults.baseURL).origin;
    } catch {
        return (typeof window !== 'undefined' && window.location?.origin) ? window.location.origin : 'http://localhost:5000';
    }
}

export function resolveServerUrl(urlOrPath) {
    if (!urlOrPath || typeof urlOrPath !== 'string') return null;
    if (urlOrPath.startsWith('data:') || urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) return urlOrPath;
    const origin = getServerOrigin();
    const path = urlOrPath.startsWith('/') ? urlOrPath : `/${urlOrPath}`;
    return `${origin}${path}`;
}

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && [401, 403].includes(error.response.status)) {
            console.error('Authentication Error:', error.response.data.message);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            // Redirect to login if not already there
            if (!window.location.pathname.startsWith('/login')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
