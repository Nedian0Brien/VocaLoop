import { apiRequest } from './apiClient';

export const extractWordsFromScreenshot = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiRequest('/api/vocabulary-imports/screenshot/extract', {
    method: 'POST',
    body: formData,
  });
};
