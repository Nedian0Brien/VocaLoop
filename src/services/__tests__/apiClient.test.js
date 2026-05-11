import { afterEach, expect, test, vi } from 'vitest';

import { apiRequest } from '../apiClient';

afterEach(() => {
    vi.unstubAllGlobals();
});

test('apiRequest sends credentials by default', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiRequest('/api/test')).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
            credentials: 'include',
        }),
    );
});

test('apiRequest throws a structured error for json error responses', async () => {
    vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
            ok: false,
            status: 401,
            json: async () => ({ detail: 'Invalid session' }),
            text: async () => JSON.stringify({ detail: 'Invalid session' }),
        }),
    );

    await expect(apiRequest('/api/test')).rejects.toMatchObject({
        name: 'ApiError',
        status: 401,
        message: 'Invalid session',
    });
});
