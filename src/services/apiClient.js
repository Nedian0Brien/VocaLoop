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
        headers: {
            Accept: 'application/json',
            ...prepared.headers,
        },
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
