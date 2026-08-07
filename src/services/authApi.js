import { clearSessionToken, saveSessionToken } from '../native/sessionStore';
import { apiRequest } from './apiClient';

/**
 * 백엔드는 네이티브 클라이언트 요청에만 `session_token`을 실어 보낸다.
 * 웹 응답에는 항상 null이므로 이 헬퍼는 웹에서 아무 일도 하지 않는다.
 */
const persistNativeSession = async (response) => {
    if (response?.session_token) {
        await saveSessionToken(response.session_token);
    }

    return response;
};

export const signup = async (payload) =>
    persistNativeSession(
        await apiRequest('/api/auth/signup', {
            method: 'POST',
            body: payload,
        }),
    );

export const login = async (payload) =>
    persistNativeSession(
        await apiRequest('/api/auth/login', {
            method: 'POST',
            body: payload,
        }),
    );

export const logout = async () => {
    try {
        return await apiRequest('/api/auth/logout', {
            method: 'POST',
        });
    } finally {
        // 서버 호출이 실패해도 기기에 남은 토큰은 반드시 지운다.
        await clearSessionToken();
    }
};

export const getCurrentUser = () => apiRequest('/api/auth/me');
