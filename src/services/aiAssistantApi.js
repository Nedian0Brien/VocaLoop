import { apiRequest } from './apiClient';

/**
 * VocaLoop AI 탭이 쓰는 `/api/ai/conversations` 래퍼.
 * 응답 모양은 `backend/app/schemas/ai.py`의 AiConversationRead / AiMessageRead 다.
 */
export const AI_IMPORT_ACCEPT = '.pdf,.csv,.xlsx';
export const AI_IMPORT_MAX_FILE_SIZE = 100 * 1024 * 1024;

export const listConversations = () => apiRequest('/api/ai/conversations');

export const createConversation = (title = null) =>
  apiRequest('/api/ai/conversations', { method: 'POST', body: title ? { title } : {} });

export const renameConversation = (conversationId, title) =>
  apiRequest(`/api/ai/conversations/${conversationId}`, { method: 'PATCH', body: { title } });

export const deleteConversation = (conversationId) =>
  apiRequest(`/api/ai/conversations/${conversationId}`, { method: 'DELETE' });

export const listMessages = (conversationId) =>
  apiRequest(`/api/ai/conversations/${conversationId}/messages`);

export const sendMessage = (conversationId, { content = '', file = null } = {}) => {
  const formData = new FormData();
  if (content) formData.append('content', content);
  if (file) formData.append('file', file, file.name);
  return apiRequest(`/api/ai/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: formData,
  });
};

export const recordImportResult = (conversationId, messageId, result) =>
  apiRequest(`/api/ai/conversations/${conversationId}/messages/${messageId}/import-result`, {
    method: 'PATCH',
    body: result,
  });
