import { apiRequest } from './apiClient';

export const listToeflReviewItems = (params = {}) => {
    const query = new URLSearchParams();
    if (params.scope) query.set('scope', params.scope);
    if (params.limit) query.set('limit', String(params.limit));
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return apiRequest(`/api/toefl/review-items${suffix}`);
};

export const updateToeflReviewItem = (itemId, payload) =>
    apiRequest(`/api/toefl/review-items/${itemId}`, {
        method: 'PATCH',
        body: payload,
    });
