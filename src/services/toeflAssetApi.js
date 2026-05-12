import { apiRequest } from './apiClient';

export const listToeflAssets = (params = {}) => {
    const query = new URLSearchParams();
    if (params.mode) query.set('mode', params.mode);
    if (params.limit) query.set('limit', String(params.limit));
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return apiRequest(`/api/toefl/assets${suffix}`);
};

export const createToeflAsset = (payload) =>
    apiRequest('/api/toefl/assets', {
        method: 'POST',
        body: payload,
    });

export const getToeflAsset = (assetId) => apiRequest(`/api/toefl/assets/${assetId}`);

export const createToeflAttempt = (assetId, payload) =>
    apiRequest(`/api/toefl/assets/${assetId}/attempts`, {
        method: 'POST',
        body: payload,
    });
