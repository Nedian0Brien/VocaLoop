import { apiRequest, resolveAssetUrl } from './apiClient';

export const uploadProfileImage = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiRequest('/api/uploads/profile-image', {
        method: 'POST',
        body: formData,
    });

    // 네이티브에서 바로 <img src>에 들어가므로 절대 URL로 맞춰준다.
    return { ...response, photo_url: resolveAssetUrl(response?.photo_url) };
};

export const deleteProfileImage = () =>
    apiRequest('/api/uploads/profile-image', {
        method: 'DELETE',
    });
