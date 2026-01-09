/**
 * Authentication Helper Utilities
 * Handles token validation, expiration checks, and automatic logout
 */

/**
 * Decode JWT token without verification
 * @param {string} token - JWT token
 * @returns {object|null} Decoded payload or null if invalid
 */
export function decodeJWT(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Failed to decode JWT:', error);
        return null;
    }
}

/**
 * Check if token is expired
 * @param {string} token - JWT token
 * @returns {boolean} True if expired or invalid
 */
export function isTokenExpired(token) {
    if (!token) return true;

    const decoded = decodeJWT(token);
    if (!decoded || !decoded.exp) return true;

    const expirationTime = decoded.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();

    return expirationTime < currentTime;
}

/**
 * Get token from localStorage
 * @returns {string|null} Token or null if not found
 */
export function getToken() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
}

/**
 * Get user from localStorage
 * @returns {object|null} User object or null if not found
 */
export function getUser() {
    if (typeof window === 'undefined') return null;

    try {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
        console.error('Failed to parse user data:', error);
        return null;
    }
}

/**
 * Check if user is authenticated with a valid token
 * @returns {boolean} True if authenticated
 */
export function isAuthenticated() {
    const token = getToken();
    return token && !isTokenExpired(token);
}

/**
 * Clear authentication data and redirect to login
 * @param {string} redirectPath - Path to redirect after logout (default: '/login')
 */
export function logout(redirectPath = '/login') {
    if (typeof window === 'undefined') return;

    localStorage.removeItem('token');
    localStorage.removeItem('user');

    window.location.href = redirectPath;
}

/**
 * Handle API authentication errors
 * Automatically logs out user if token is invalid
 * @param {Error} error - Axios error object
 */
export function handleAuthError(error) {
    if (error.response) {
        const status = error.response.status;
        const message = error.response.data?.error || error.message;

        // Token-related errors (401 Unauthorized, 400 Invalid Token, 403 Forbidden)
        if (status === 401 || status === 400 || status === 403) {
            console.error('Authentication error:', message);

            // Check if it's a token issue
            if (message.toLowerCase().includes('token') ||
                message.toLowerCase().includes('unauthorized') ||
                message.toLowerCase().includes('access denied')) {

                console.warn('Invalid or expired token detected. Logging out...');
                logout();
                return;
            }
        }
    }

    // Re-throw the error for the caller to handle
    throw error;
}

/**
 * Get authorization headers for API requests
 * @returns {object} Headers object with Authorization
 */
export function getAuthHeaders() {
    const token = getToken();

    if (!token) {
        throw new Error('No authentication token found');
    }

    if (isTokenExpired(token)) {
        logout();
        throw new Error('Token expired. Please login again.');
    }

    return {
        Authorization: `Bearer ${token}`
    };
}

/**
 * Check token expiration and show warning if expiring soon
 * @param {number} warningMinutes - Minutes before expiration to show warning (default: 30)
 * @returns {object} Status object with isExpired, expiresIn, and shouldWarn
 */
export function checkTokenExpiration(warningMinutes = 30) {
    const token = getToken();

    if (!token) {
        return { isExpired: true, expiresIn: 0, shouldWarn: false };
    }

    const decoded = decodeJWT(token);
    if (!decoded || !decoded.exp) {
        return { isExpired: true, expiresIn: 0, shouldWarn: false };
    }

    const expirationTime = decoded.exp * 1000;
    const currentTime = Date.now();
    const timeUntilExpiration = expirationTime - currentTime;
    const minutesUntilExpiration = Math.floor(timeUntilExpiration / 1000 / 60);

    return {
        isExpired: timeUntilExpiration <= 0,
        expiresIn: minutesUntilExpiration,
        shouldWarn: minutesUntilExpiration > 0 && minutesUntilExpiration <= warningMinutes
    };
}
