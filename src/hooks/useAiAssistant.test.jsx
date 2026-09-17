// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const api = vi.hoisted(() => ({
  createConversation: vi.fn(),
  deleteConversation: vi.fn(),
  listConversations: vi.fn(),
  listMessages: vi.fn(),
  recordImportResult: vi.fn(),
  renameConversation: vi.fn(),
  sendMessage: vi.fn(),
}));

vi.mock('../services/aiAssistantApi', () => api);

import { useAiAssistant } from './useAiAssistant';

const conversation = (id, title = `대화 ${id}`, updatedAt = `2026-09-17T00:00:0${id}Z`) => ({
  id,
  title,
  created_at: updatedAt,
  updated_at: updatedAt,
});

const message = (id, overrides = {}) => ({
  id,
  conversation_id: 1,
  role: 'assistant',
  kind: 'text',
  content: '',
  payload: {},
  status: 'ready',
  created_at: '2026-09-17T00:00:00Z',
  updated_at: '2026-09-17T00:00:00Z',
  ...overrides,
});

const importMessage = (id, overrides = {}) =>
  message(id, {
    kind: 'file_import',
    status: 'ready',
    payload: {
      file_name: 'words.csv',
      batch_size: 2,
      entries: [
        { word: 'abate', meaning_ko: '줄이다' },
        { word: 'candid', meaning_ko: null },
        { word: 'ephemeral', meaning_ko: '덧없는' },
      ],
      results: [],
      suggested_folder_name: 'TOEFL',
    },
    ...overrides,
  });

const renderAssistant = (overrides = {}) => {
  const props = {
    onBulkAddWords: vi.fn(),
    onCreateFolder: vi.fn(),
    showNotification: vi.fn(),
    pollIntervalMs: 50,
    ...overrides,
  };
  return { ...renderHook(() => useAiAssistant(props)), props };
};

describe('useAiAssistant', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.listConversations.mockResolvedValue([conversation(1), conversation(2)]);
    api.listMessages.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('loads conversations newest first and opens the most recent one', async () => {
    api.listMessages.mockResolvedValue([message(10, { role: 'user', content: '안녕' })]);

    const { result } = renderAssistant();

    await waitFor(() => expect(result.current.isLoadingConversations).toBe(false));
    expect(result.current.conversations.map((item) => item.id)).toEqual([2, 1]);
    expect(result.current.activeConversationId).toBe(2);
    await waitFor(() => expect(result.current.messages).toHaveLength(1));
    expect(api.listMessages).toHaveBeenCalledWith(2);
  });

  test('creates the conversation lazily on the first send and appends both messages', async () => {
    api.listConversations.mockResolvedValue([]);
    api.createConversation.mockResolvedValue(conversation(7, ''));
    api.sendMessage.mockResolvedValue({
      conversation: conversation(7, 'words.csv'),
      messages: [message(1, { role: 'user', content: '' }), importMessage(2, { status: 'pending' })],
    });

    const { result } = renderAssistant();
    await waitFor(() => expect(result.current.isLoadingConversations).toBe(false));
    expect(result.current.activeConversationId).toBeNull();

    const file = new File(['abate,줄이다'], 'words.csv', { type: 'text/csv' });
    let sent;
    await act(async () => {
      sent = await result.current.send({ content: '  ', file });
    });

    expect(sent).toBe(true);
    expect(api.createConversation).toHaveBeenCalledTimes(1);
    expect(api.sendMessage).toHaveBeenCalledWith(7, { content: '', file });
    expect(result.current.activeConversationId).toBe(7);
    expect(result.current.conversations[0].title).toBe('words.csv');
    expect(result.current.messages.map((item) => item.id)).toEqual([1, 2]);
    expect(result.current.isPolling).toBe(true);
  });

  test('polls while a message is pending and stops once it is ready', async () => {
    api.listMessages
      .mockResolvedValueOnce([importMessage(2, { status: 'pending' })])
      .mockResolvedValueOnce([importMessage(2, { status: 'pending' })])
      .mockResolvedValue([importMessage(2, { status: 'ready' })]);

    const { result } = renderAssistant();

    await waitFor(() => expect(result.current.isPolling).toBe(true));
    await waitFor(() => expect(result.current.messages[0].status).toBe('ready'));
    expect(result.current.isPolling).toBe(false);

    const callsAfterReady = api.listMessages.mock.calls.length;
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(api.listMessages.mock.calls.length).toBe(callsAfterReady);
  });

  test('rejects an empty send without touching the API', async () => {
    const { result } = renderAssistant();
    await waitFor(() => expect(result.current.isLoadingConversations).toBe(false));

    let sent;
    await act(async () => {
      sent = await result.current.send({ content: '   ' });
    });

    expect(sent).toBe(false);
    expect(api.sendMessage).not.toHaveBeenCalled();
  });

  test('renames and deletes conversations, moving selection off a deleted one', async () => {
    api.renameConversation.mockResolvedValue(conversation(2, '새 이름', '2026-09-18T00:00:00Z'));
    api.deleteConversation.mockResolvedValue(null);

    const { result } = renderAssistant();
    await waitFor(() => expect(result.current.activeConversationId).toBe(2));

    await act(async () => {
      await result.current.rename(2, '  새 이름  ');
    });
    expect(api.renameConversation).toHaveBeenCalledWith(2, '새 이름');
    expect(result.current.conversations[0].title).toBe('새 이름');

    await act(async () => {
      await result.current.remove(2);
    });
    expect(result.current.conversations.map((item) => item.id)).toEqual([1]);
    expect(result.current.activeConversationId).toBe(1);
  });

  test('saves a batch: creates the folder, runs bulk add with glosses, records the summary', async () => {
    const pending = importMessage(2);
    api.listMessages.mockResolvedValue([pending]);
    api.recordImportResult.mockImplementation(async (conversationId, messageId, body) => ({
      ...pending,
      payload: { ...pending.payload, results: [body] },
    }));

    const onCreateFolder = vi.fn(async (name) => ({ id: 42, name }));
    const onBulkAddWords = vi.fn(async () => ({
      createdWords: [{ word: 'abate' }],
      assignedWords: [],
      skippedWords: [{ word: 'candid' }],
      failedWords: [],
    }));

    const { result } = renderAssistant({ onCreateFolder, onBulkAddWords });
    await waitFor(() => expect(result.current.messages).toHaveLength(1));

    const entries = pending.payload.entries.slice(0, 2);
    let saved;
    await act(async () => {
      saved = await result.current.saveImportBatch({
        message: result.current.messages[0],
        batchIndex: 0,
        entries,
        newFolderName: 'TOEFL',
      });
    });

    expect(saved).toBe(true);
    expect(onCreateFolder).toHaveBeenCalledWith('TOEFL', 'blue', null);
    expect(onBulkAddWords).toHaveBeenCalledWith({ words: entries, folderId: 42 });
    expect(api.recordImportResult).toHaveBeenCalledWith(1, 2, {
      batch_index: 0,
      status: 'saved',
      folder_id: 42,
      folder_name: 'TOEFL',
      summary: { created: 1, assigned: 0, skipped: 1, failed: 0, failed_words: [] },
    });
    expect(result.current.messages[0].payload.results).toHaveLength(1);
    expect(result.current.savingMessageId).toBeNull();
  });

  test('does not record a batch when bulk add throws, and surfaces the error', async () => {
    const pending = importMessage(2);
    api.listMessages.mockResolvedValue([pending]);
    const onBulkAddWords = vi.fn(async () => {
      throw new Error('0개 처리, 2개 실패');
    });

    const { result } = renderAssistant({ onBulkAddWords });
    await waitFor(() => expect(result.current.messages).toHaveLength(1));

    let saved;
    await act(async () => {
      saved = await result.current.saveImportBatch({
        message: result.current.messages[0],
        batchIndex: 0,
        entries: pending.payload.entries.slice(0, 2),
        folderId: 5,
      });
    });

    expect(saved).toBe(false);
    expect(api.recordImportResult).not.toHaveBeenCalled();
    expect(result.current.error).toBe('0개 처리, 2개 실패');
  });

  test('cancelImport records a cancelled batch', async () => {
    const pending = importMessage(2);
    api.listMessages.mockResolvedValue([pending]);
    api.recordImportResult.mockResolvedValue({ ...pending, status: 'done' });

    const { result } = renderAssistant();
    await waitFor(() => expect(result.current.messages).toHaveLength(1));

    await act(async () => {
      await result.current.cancelImport({ message: result.current.messages[0], batchIndex: 0 });
    });

    expect(api.recordImportResult).toHaveBeenCalledWith(1, 2, { batch_index: 0, status: 'cancelled' });
    expect(result.current.messages[0].status).toBe('done');
  });
});
