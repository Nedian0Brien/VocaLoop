import { afterEach, beforeEach, expect, test, vi } from 'vitest';

const isNativeAppMock = vi.fn();
const getPlatformMock = vi.fn();
const getSessionTokenMock = vi.fn();

vi.mock('../../native/platform', () => ({
    isNativeApp: isNativeAppMock,
    getPlatform: getPlatformMock,
    isIos: () => getPlatformMock() === 'ios',
    CLIENT_HEADER_NAME: 'X-VocaLoop-Client',
}));

vi.mock('../../native/sessionStore', () => ({
    getSessionToken: getSessionTokenMock,
    restoreSessionToken: vi.fn(),
    saveSessionToken: vi.fn(),
    clearSessionToken: vi.fn(),
}));

const okFetch = () =>
    vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ ok: true }),
    });

const loadApiClient = async () => {
    vi.resetModules();
    return import('../apiClient');
};

const requestHeaders = (fetchMock) => fetchMock.mock.calls[0][1].headers;

beforeEach(() => {
    isNativeAppMock.mockReset().mockReturnValue(true);
    getPlatformMock.mockReset().mockReturnValue('ios');
    getSessionTokenMock.mockReset().mockReturnValue('stored-token');
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
});

test('네이티브 요청에 클라이언트 헤더와 Bearer 토큰을 붙인다', async () => {
    const fetchMock = okFetch();
    vi.stubGlobal('fetch', fetchMock);
    const { apiRequest } = await loadApiClient();

    await apiRequest('/api/words');

    expect(requestHeaders(fetchMock)).toMatchObject({
        'X-VocaLoop-Client': 'ios',
        Authorization: 'Bearer stored-token',
    });
});

test('웹 요청에는 네이티브 헤더를 붙이지 않는다', async () => {
    isNativeAppMock.mockReturnValue(false);
    const fetchMock = okFetch();
    vi.stubGlobal('fetch', fetchMock);
    const { apiRequest } = await loadApiClient();

    await apiRequest('/api/words');

    const headers = requestHeaders(fetchMock);
    expect(headers).not.toHaveProperty('Authorization');
    expect(headers).not.toHaveProperty('X-VocaLoop-Client');
});

test('토큰이 없으면 Authorization 헤더를 생략한다', async () => {
    getSessionTokenMock.mockReturnValue(null);
    const fetchMock = okFetch();
    vi.stubGlobal('fetch', fetchMock);
    const { apiRequest } = await loadApiClient();

    await apiRequest('/api/auth/login', { method: 'POST', body: { email: 'a@b.c' } });

    const headers = requestHeaders(fetchMock);
    expect(headers).not.toHaveProperty('Authorization');
    expect(headers['X-VocaLoop-Client']).toBe('ios');
});

test('호출자가 지정한 Authorization 헤더를 덮어쓰지 않는다', async () => {
    const fetchMock = okFetch();
    vi.stubGlobal('fetch', fetchMock);
    const { apiRequest } = await loadApiClient();

    await apiRequest('/api/words', { headers: { Authorization: 'Bearer explicit' } });

    expect(requestHeaders(fetchMock).Authorization).toBe('Bearer explicit');
});

test('resolveAssetUrl은 API base URL이 없으면 경로를 그대로 둔다', async () => {
    const { resolveAssetUrl } = await loadApiClient();

    expect(resolveAssetUrl('/uploads/profile/a.png')).toBe('/uploads/profile/a.png');
    expect(resolveAssetUrl(null)).toBeNull();
});

test('resolveAssetUrl은 API base URL이 있으면 상대 경로만 절대 URL로 바꾼다', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://vocaloop.lawdigest.kr');
    const { resolveAssetUrl } = await loadApiClient();

    expect(resolveAssetUrl('/uploads/profile/a.png')).toBe(
        'https://vocaloop.lawdigest.kr/uploads/profile/a.png',
    );
    expect(resolveAssetUrl('https://cdn.example.com/a.png')).toBe('https://cdn.example.com/a.png');
    expect(resolveAssetUrl('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA');
    expect(resolveAssetUrl('')).toBe('');

    vi.unstubAllEnvs();
});
