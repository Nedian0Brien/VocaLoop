import { CLIENT_HEADER_NAME, getPlatform, isNativeApp } from '../native/platform';
import { getSessionToken } from '../native/sessionStore';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() || '';

export class ApiError extends Error {
    constructor(message, { status, data } = {}) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}

const isPlainObject = (value) => Object.prototype.toString.call(value) === '[object Object]';

const hasHeader = (headers, headerName) =>
    Object.keys(headers).some((key) => key.toLowerCase() === headerName.toLowerCase());

const buildUrl = (path) => {
    if (!API_BASE_URL) {
        return path;
    }

    return new URL(path, API_BASE_URL).toString();
};

/**
 * 서버가 내려주는 `/uploads/...` 같은 상대 경로를 실제로 로드 가능한 URL로 바꾼다.
 * 네이티브에서는 앱 origin이 capacitor://localhost라 상대 경로가 API 서버를 가리키지 않는다.
 */
export const resolveAssetUrl = (path) => {
    if (!path || !API_BASE_URL) return path;
    if (/^[a-z][a-z0-9+.-]*:/i.test(path) || path.startsWith('//')) return path;

    return new URL(path, API_BASE_URL).toString();
};

/**
 * 네이티브 앱은 HttpOnly 쿠키를 신뢰할 수 없어 Bearer 토큰으로 인증한다.
 * 웹은 기존대로 쿠키만 쓰므로 헤더를 붙이지 않는다.
 */
const withNativeAuthHeaders = (headers) => {
    if (!isNativeApp()) return headers;

    const nativeHeaders = { ...headers, [CLIENT_HEADER_NAME]: getPlatform() };
    const sessionToken = getSessionToken();
    if (sessionToken && !hasHeader(nativeHeaders, 'authorization')) {
        nativeHeaders.Authorization = `Bearer ${sessionToken}`;
    }

    return nativeHeaders;
};

const prepareBody = (body, headers) => {
    if (body == null) {
        return { body: undefined, headers };
    }

    if (
        body instanceof FormData ||
        body instanceof Blob ||
        body instanceof ArrayBuffer ||
        body instanceof URLSearchParams ||
        typeof body === 'string'
    ) {
        return { body, headers };
    }

    if (isPlainObject(body) || Array.isArray(body)) {
        const nextHeaders = hasHeader(headers, 'content-type')
            ? headers
            : { ...headers, 'Content-Type': 'application/json' };
        return {
            body: JSON.stringify(body),
            headers: nextHeaders,
        };
    }

    return { body, headers };
};

const parseResponseBody = async (response) => {
    if (response.status === 204) {
        return null;
    }

    if (typeof response.text === 'function') {
        const text = await response.text();
        if (!text) {
            return null;
        }

        try {
            return JSON.parse(text);
        } catch {
            return text;
        }
    }

    if (typeof response.json === 'function') {
        return await response.json();
    }

    return null;
};

const formatErrorMessage = (data, status) => {
    if (data == null) {
        return `Request failed with status ${status}`;
    }

    if (typeof data === 'string') {
        try {
            return formatErrorMessage(JSON.parse(data), status);
        } catch {
            return data;
        }
    }

    if (typeof data.detail === 'string') {
        return data.detail;
    }

    if (Array.isArray(data.detail)) {
        return data.detail
            .map((item) => {
                if (typeof item === 'string') {
                    return item;
                }
                return item?.msg || item?.message || JSON.stringify(item);
            })
            .join(', ');
    }

    if (typeof data.message === 'string') {
        return data.message;
    }

    if (typeof data.error === 'string') {
        return data.error;
    }

    return `Request failed with status ${status}`;
};

export async function apiRequest(path, options = {}) {
    const {
        body,
        headers = {},
        method = body == null ? 'GET' : 'POST',
        ...rest
    } = options;
    const prepared = prepareBody(body, headers);
    const response = await fetch(buildUrl(path), {
        ...rest,
        method,
        credentials: 'include',
        headers: withNativeAuthHeaders({
            Accept: 'application/json',
            ...prepared.headers,
        }),
        ...(prepared.body !== undefined ? { body: prepared.body } : {}),
    });

    const data = await parseResponseBody(response);
    if (!response.ok) {
        throw new ApiError(formatErrorMessage(data, response.status), {
            status: response.status,
            data,
        });
    }

    return data;
}
