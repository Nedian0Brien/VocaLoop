import { apiRequest } from './apiClient';

export const uploadProfileImage = (file) => {
    const formData = new FormData();
    formData.append('file', file);

    return apiRequest('/api/uploads/profile-image', {
        method: 'POST',
        body: formData,
    });
};

export const deleteProfileImage = () =>
    apiRequest('/api/uploads/profile-image', {
        method: 'DELETE',
    });
