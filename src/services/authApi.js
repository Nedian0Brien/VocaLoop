import { apiRequest } from './apiClient';

export const signup = (payload) =>
    apiRequest('/api/auth/signup', {
        method: 'POST',
        body: payload,
    });

export const login = (payload) =>
    apiRequest('/api/auth/login', {
        method: 'POST',
        body: payload,
    });

export const logout = () =>
    apiRequest('/api/auth/logout', {
        method: 'POST',
    });

export const getCurrentUser = () => apiRequest('/api/auth/me');
