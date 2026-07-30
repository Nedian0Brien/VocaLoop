// @vitest-environment jsdom

import React, { StrictMode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const geminiService = vi.hoisted(() => ({
  generateWordData: vi.fn(),
}));

const wordApi = vi.hoisted(() => ({
  createWord: vi.fn(),
}));

vi.mock('../services/geminiService', () => geminiService);
vi.mock('../services/wordApi', () => wordApi);

import { useWordCreationQueue } from './useWordCreationQueue';

const createDeferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
};

const aiConfig = {
  provider: 'gemini',
  model: 'gemini-2.0-flash',
  apiKey: 'test-key',
};

describe('useWordCreationQueue', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('processes one queued word exactly once in StrictMode', async () => {
    const analysis = createDeferred();
    const onWordSaved = vi.fn();
    const showNotification = vi.fn();
    geminiService.generateWordData.mockReturnValueOnce(analysis.promise);
    wordApi.createWord.mockResolvedValueOnce({
      id: 101,
      word: 'abate',
      folder_id: 7,
    });

    const { result } = renderHook(
      () => useWordCreationQueue({
        onWordSaved,
        showNotification,
        userId: 1,
      }),
      {
        wrapper: StrictMode,
      },
    );

    act(() => {
      result.current.enqueue({
        aiConfig,
        folderId: 7,
        folderName: 'Core',
        word: 'abate',
      });
    });

    expect(geminiService.generateWordData).toHaveBeenCalledTimes(1);

    await act(async () => {
      analysis.resolve({
        word: 'abate',
        meaning_ko: '줄다',
      });
      await analysis.promise;
    });

    await waitFor(() => {
      expect(wordApi.createWord).toHaveBeenCalledTimes(1);
      expect(onWordSaved).toHaveBeenCalledTimes(1);
    });
    expect(wordApi.createWord).toHaveBeenCalledWith(expect.objectContaining({
      folder_id: 7,
      folder_ids: [7],
      word: 'abate',
    }));
  });

  test('processes rapidly queued words one at a time in order', async () => {
    const firstAnalysis = createDeferred();
    geminiService.generateWordData
      .mockReturnValueOnce(firstAnalysis.promise)
      .mockResolvedValueOnce({ word: 'candid', meaning_ko: '솔직한' });
    wordApi.createWord.mockImplementation(async (payload) => ({
      id: payload.word === 'abate' ? 101 : 102,
      ...payload,
    }));

    const { result } = renderHook(() => useWordCreationQueue({
      onWordSaved: vi.fn(),
      showNotification: vi.fn(),
      userId: 1,
    }));

    act(() => {
      result.current.enqueue({ aiConfig, folderId: 7, word: 'abate' });
      result.current.enqueue({ aiConfig, folderId: 8, word: 'candid' });
    });

    expect(geminiService.generateWordData).toHaveBeenCalledTimes(1);
    expect(result.current.jobs.map((job) => job.status)).toEqual(['processing', 'queued']);

    await act(async () => {
      firstAnalysis.resolve({ word: 'abate', meaning_ko: '줄다' });
      await firstAnalysis.promise;
    });

    await waitFor(() => {
      expect(wordApi.createWord).toHaveBeenCalledTimes(2);
    });
    expect(geminiService.generateWordData.mock.calls.map(([word]) => word)).toEqual(['abate', 'candid']);
    expect(wordApi.createWord.mock.calls.map(([payload]) => payload.folder_id)).toEqual([7, 8]);
  });

  test('continues after an analysis failure and names the failed word', async () => {
    const showNotification = vi.fn();
    geminiService.generateWordData
      .mockRejectedValueOnce(new Error('analysis broke'))
      .mockResolvedValueOnce({ word: 'candid', meaning_ko: '솔직한' });
    wordApi.createWord.mockImplementation(async (payload) => ({ id: 102, ...payload }));

    const { result } = renderHook(() => useWordCreationQueue({
      onWordSaved: vi.fn(),
      showNotification,
      userId: 1,
    }));

    act(() => {
      result.current.enqueue({ aiConfig, folderId: null, word: 'abate' });
      result.current.enqueue({ aiConfig, folderId: null, word: 'candid' });
    });

    await waitFor(() => {
      expect(wordApi.createWord).toHaveBeenCalledWith(expect.objectContaining({ word: 'candid' }));
    });
    expect(showNotification).toHaveBeenCalledWith(
      expect.stringContaining("'abate'"),
      'error',
    );
  });

  test('continues after a save failure and names the failed word', async () => {
    const showNotification = vi.fn();
    geminiService.generateWordData
      .mockResolvedValueOnce({ word: 'abate', meaning_ko: '줄다' })
      .mockResolvedValueOnce({ word: 'candid', meaning_ko: '솔직한' });
    wordApi.createWord
      .mockRejectedValueOnce(new Error('save broke'))
      .mockImplementationOnce(async (payload) => ({ id: 102, ...payload }));

    const { result } = renderHook(() => useWordCreationQueue({
      onWordSaved: vi.fn(),
      showNotification,
      userId: 1,
    }));

    act(() => {
      result.current.enqueue({ aiConfig, folderId: null, word: 'abate' });
      result.current.enqueue({ aiConfig, folderId: null, word: 'candid' });
    });

    await waitFor(() => {
      expect(wordApi.createWord).toHaveBeenCalledTimes(2);
    });
    expect(showNotification).toHaveBeenCalledWith(
      expect.stringContaining("'abate'"),
      'error',
    );
  });

  test('restarts the worker for a word queued during the success callback', async () => {
    geminiService.generateWordData
      .mockResolvedValueOnce({ word: 'abate', meaning_ko: '줄다' })
      .mockResolvedValueOnce({ word: 'candid', meaning_ko: '솔직한' });
    wordApi.createWord.mockImplementation(async (payload) => ({ id: payload.word, ...payload }));

    let enqueue;
    const onWordSaved = vi.fn((savedWord) => {
      if (savedWord.word === 'abate') {
        enqueue({ aiConfig, folderId: null, word: 'candid' });
      }
    });
    const { result } = renderHook(() => useWordCreationQueue({
      onWordSaved,
      showNotification: vi.fn(),
      userId: 1,
    }));
    enqueue = result.current.enqueue;

    act(() => {
      enqueue({ aiConfig, folderId: null, word: 'abate' });
    });

    await waitFor(() => {
      expect(wordApi.createWord).toHaveBeenCalledTimes(2);
    });
    expect(onWordSaved.mock.calls.map(([word]) => word.word)).toEqual(['abate', 'candid']);
  });

  test('snapshots the AI config when a word is queued', async () => {
    const analysis = createDeferred();
    const mutableConfig = { ...aiConfig };
    geminiService.generateWordData.mockReturnValueOnce(analysis.promise);
    wordApi.createWord.mockResolvedValueOnce({ id: 101, word: 'abate' });

    const { result } = renderHook(() => useWordCreationQueue({
      onWordSaved: vi.fn(),
      showNotification: vi.fn(),
      userId: 1,
    }));

    act(() => {
      result.current.enqueue({
        aiConfig: mutableConfig,
        folderId: null,
        word: 'abate',
      });
      mutableConfig.model = 'gemini-2.5-flash';
    });

    expect(geminiService.generateWordData).toHaveBeenCalledWith(
      'abate',
      expect.objectContaining({ model: 'gemini-2.0-flash' }),
    );

    await act(async () => {
      analysis.resolve({ word: 'abate' });
      await analysis.promise;
    });
  });

  test('drops queued work when the signed-in user changes', async () => {
    const analysis = createDeferred();
    geminiService.generateWordData.mockReturnValueOnce(analysis.promise);

    const { result, rerender } = renderHook(
      ({ userId }) => useWordCreationQueue({
        onWordSaved: vi.fn(),
        showNotification: vi.fn(),
        userId,
      }),
      {
        initialProps: { userId: 1 },
      },
    );

    act(() => {
      result.current.enqueue({ aiConfig, folderId: null, word: 'abate' });
    });
    rerender({ userId: 2 });

    await act(async () => {
      analysis.resolve({ word: 'abate' });
      await analysis.promise;
    });

    await waitFor(() => {
      expect(result.current.jobs).toEqual([]);
    });
    expect(wordApi.createWord).not.toHaveBeenCalled();
  });

  test('ignores a save response from the previous signed-in user', async () => {
    const save = createDeferred();
    const onWordSaved = vi.fn();
    const showNotification = vi.fn();
    geminiService.generateWordData.mockResolvedValueOnce({ word: 'abate' });
    wordApi.createWord.mockReturnValueOnce(save.promise);

    const { result, rerender } = renderHook(
      ({ userId }) => useWordCreationQueue({
        onWordSaved,
        showNotification,
        userId,
      }),
      {
        initialProps: { userId: 1 },
      },
    );

    act(() => {
      result.current.enqueue({ aiConfig, folderId: null, word: 'abate' });
    });
    await waitFor(() => {
      expect(wordApi.createWord).toHaveBeenCalledTimes(1);
    });

    rerender({ userId: 2 });
    await act(async () => {
      save.resolve({ id: 101, word: 'abate' });
      await save.promise;
    });

    expect(onWordSaved).not.toHaveBeenCalled();
    expect(showNotification).not.toHaveBeenCalled();
  });

  test('uses current callbacks for a new user queued behind stale work', async () => {
    const staleAnalysis = createDeferred();
    const firstOnWordSaved = vi.fn();
    const nextOnWordSaved = vi.fn();
    const firstNotification = vi.fn();
    const nextNotification = vi.fn();
    geminiService.generateWordData
      .mockReturnValueOnce(staleAnalysis.promise)
      .mockResolvedValueOnce({ word: 'candid' });
    wordApi.createWord.mockImplementation(async (payload) => ({ id: payload.word, ...payload }));

    const { result, rerender } = renderHook(
      ({ onWordSaved, showNotification, userId }) => useWordCreationQueue({
        onWordSaved,
        showNotification,
        userId,
      }),
      {
        initialProps: {
          onWordSaved: firstOnWordSaved,
          showNotification: firstNotification,
          userId: 1,
        },
      },
    );

    act(() => {
      result.current.enqueue({ aiConfig, folderId: null, word: 'abate' });
    });
    rerender({
      onWordSaved: nextOnWordSaved,
      showNotification: nextNotification,
      userId: 2,
    });
    act(() => {
      result.current.enqueue({ aiConfig, folderId: null, word: 'candid' });
    });

    await act(async () => {
      staleAnalysis.resolve({ word: 'abate' });
      await staleAnalysis.promise;
    });

    await waitFor(() => {
      expect(nextOnWordSaved).toHaveBeenCalledWith(expect.objectContaining({ word: 'candid' }));
    });
    expect(firstOnWordSaved).not.toHaveBeenCalled();
    expect(firstNotification).not.toHaveBeenCalled();
  });
});
