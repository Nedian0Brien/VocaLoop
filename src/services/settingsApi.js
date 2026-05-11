import { apiRequest } from './apiClient';

export const getSettings = () => apiRequest('/api/settings');

export const updateSettings = (payload) =>
    apiRequest('/api/settings', {
        method: 'PUT',
        body: payload,
    });
