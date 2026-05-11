import { apiRequest } from './apiClient';

export const listWords = () => apiRequest('/api/words');

export const createWord = (payload) =>
    apiRequest('/api/words', {
        method: 'POST',
        body: payload,
    });

export const updateWord = (wordId, payload) =>
    apiRequest(`/api/words/${wordId}`, {
        method: 'PATCH',
        body: payload,
    });

export const deleteWord = (wordId) =>
    apiRequest(`/api/words/${wordId}`, {
        method: 'DELETE',
    });
