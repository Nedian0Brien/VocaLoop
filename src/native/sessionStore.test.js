import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const preferencesMock = {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
};
const isNativeAppMock = vi.fn();

vi.mock('@capacitor/preferences', () => ({ Preferences: preferencesMock }));
vi.mock('./platform', () => ({ isNativeApp: isNativeAppMock }));

const loadSessionStore = async () => {
    vi.resetModules();
    return import('./sessionStore');
};

beforeEach(() => {
    preferencesMock.get.mockReset().mockResolvedValue({ value: null });
    preferencesMock.set.mockReset().mockResolvedValue(undefined);
    preferencesMock.remove.mockReset().mockResolvedValue(undefined);
    isNativeAppMock.mockReset().mockReturnValue(true);
});

afterEach(() => {
    vi.clearAllMocks();
});

describe('웹 환경', () => {
    test('저장하거나 읽지 않는다', async () => {
        isNativeAppMock.mockReturnValue(false);
        const store = await loadSessionStore();

        await store.saveSessionToken('web-token');

        expect(preferencesMock.set).not.toHaveBeenCalled();
        expect(await store.restoreSessionToken()).toBeNull();
        expect(store.getSessionToken()).toBeNull();
        expect(preferencesMock.get).not.toHaveBeenCalled();
    });
});

describe('네이티브 환경', () => {
    test('저장한 토큰을 메모리에서 동기적으로 읽을 수 있다', async () => {
        const store = await loadSessionStore();

        await store.saveSessionToken('native-token');

        expect(store.getSessionToken()).toBe('native-token');
        expect(preferencesMock.set).toHaveBeenCalledWith({
            key: 'vocaloop.sessionToken',
            value: 'native-token',
        });
    });

    test('앱 재시작 시 저장소에서 토큰을 복원한다', async () => {
        preferencesMock.get.mockResolvedValue({ value: 'persisted-token' });
        const store = await loadSessionStore();

        expect(store.getSessionToken()).toBeNull();
        await expect(store.restoreSessionToken()).resolves.toBe('persisted-token');
        expect(store.getSessionToken()).toBe('persisted-token');
    });

    test('토큰을 지우면 메모리와 저장소 모두 비운다', async () => {
        const store = await loadSessionStore();
        await store.saveSessionToken('native-token');

        await store.clearSessionToken();

        expect(store.getSessionToken()).toBeNull();
        expect(preferencesMock.remove).toHaveBeenCalledWith({ key: 'vocaloop.sessionToken' });
    });

    test('저장소가 실패해도 이번 세션은 메모리 캐시로 동작한다', async () => {
        preferencesMock.set.mockRejectedValue(new Error('storage unavailable'));
        const store = await loadSessionStore();

        await expect(store.saveSessionToken('native-token')).resolves.toBeUndefined();
        expect(store.getSessionToken()).toBe('native-token');
    });

    test('복원이 실패하면 토큰 없음으로 떨어진다', async () => {
        preferencesMock.get.mockRejectedValue(new Error('storage unavailable'));
        const store = await loadSessionStore();

        await expect(store.restoreSessionToken()).resolves.toBeNull();
        expect(store.getSessionToken()).toBeNull();
    });
});
