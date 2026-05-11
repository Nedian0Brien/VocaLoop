import { apiRequest } from './apiClient';

export const resetAccountData = () =>
    apiRequest('/api/account/reset-data', {
        method: 'POST',
    });

export const deleteAccount = (payload) =>
    apiRequest('/api/account/delete', {
        method: 'POST',
        body: payload,
    });
