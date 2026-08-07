import { Preferences } from '@capacitor/preferences';

import { isNativeApp } from './platform';

const SESSION_TOKEN_KEY = 'vocaloop.sessionToken';

/**
 * apiClient가 매 요청마다 동기적으로 읽어야 하므로 메모리 캐시를 진실의 원본으로 둔다.
 * Preferences는 앱 재시작 사이의 영속 계층일 뿐이다.
 */
let cachedSessionToken = null;

export const getSessionToken = () => cachedSessionToken;

/** 앱 부팅 시 한 번 호출해 저장된 토큰을 메모리로 끌어올린다. */
export const restoreSessionToken = async () => {
    if (!isNativeApp()) return null;

    try {
        const { value } = await Preferences.get({ key: SESSION_TOKEN_KEY });
        cachedSessionToken = value || null;
    } catch {
        cachedSessionToken = null;
    }

    return cachedSessionToken;
};

export const saveSessionToken = async (token) => {
    if (!isNativeApp()) return;

    cachedSessionToken = token || null;

    try {
        if (cachedSessionToken) {
            await Preferences.set({ key: SESSION_TOKEN_KEY, value: cachedSessionToken });
        } else {
            await Preferences.remove({ key: SESSION_TOKEN_KEY });
        }
    } catch {
        // 저장에 실패해도 이번 세션은 메모리 캐시로 계속 동작해야 한다.
    }
};

export const clearSessionToken = () => saveSessionToken(null);
