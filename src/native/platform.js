import { Capacitor } from '@capacitor/core';

/**
 * 네이티브(iOS/Android) 여부를 판단하는 단일 소스.
 * Capacitor가 주입되지 않은 순수 웹/테스트 환경에서는 항상 false다.
 */
export const isNativeApp = () => {
    try {
        return Capacitor.isNativePlatform();
    } catch {
        return false;
    }
};

export const getPlatform = () => {
    try {
        return Capacitor.getPlatform();
    } catch {
        return 'web';
    }
};

export const isIos = () => getPlatform() === 'ios';

/** 백엔드가 네이티브 클라이언트를 식별하는 헤더 (backend/app/auth.py 와 값이 일치해야 한다). */
export const CLIENT_HEADER_NAME = 'X-VocaLoop-Client';
