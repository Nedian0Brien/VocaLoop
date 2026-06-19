import { afterEach, describe, expect, test, vi } from 'vitest';

import { extractWordsFromScreenshot } from './vocabularyImportApi';

describe('extractWordsFromScreenshot', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('uploads a screenshot with multipart form data', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ words: ['abate'], suggested_folder_name: 'TOEFL' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const file = new File(['fake image'], 'words.png', { type: 'image/png' });

    await expect(extractWordsFromScreenshot(file)).resolves.toEqual({
      words: ['abate'],
      suggested_folder_name: 'TOEFL',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/vocabulary-imports/screenshot/extract',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      }),
    );
    const requestOptions = fetchMock.mock.calls[0][1];
    expect(requestOptions.body).toBeInstanceOf(FormData);
    expect(requestOptions.body.get('file')).toBe(file);
    expect(requestOptions.headers).not.toHaveProperty('Content-Type');
  });
});
