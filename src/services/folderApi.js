import { apiRequest } from './apiClient';

export const listFolders = () => apiRequest('/api/folders');

export const createFolder = (payload) =>
    apiRequest('/api/folders', {
        method: 'POST',
        body: payload,
    });

export const updateFolder = (folderId, payload) =>
    apiRequest(`/api/folders/${folderId}`, {
        method: 'PATCH',
        body: payload,
    });

export const deleteFolder = (folderId, { deleteWords = false } = {}) =>
    apiRequest(`/api/folders/${folderId}${deleteWords ? '?delete_words=true' : ''}`, {
        method: 'DELETE',
    });

export const reorderFolders = (folderIds) =>
    apiRequest('/api/folders/reorder', {
        method: 'POST',
        body: { folder_ids: folderIds },
    });
