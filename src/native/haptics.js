import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

import { isNativeApp } from './platform';

/** 햅틱 실패는 학습 흐름을 막을 이유가 없으므로 항상 조용히 삼킨다. */
const runSilently = async (action) => {
    if (!isNativeApp()) return;

    try {
        await action();
    } catch {
        // 무시
    }
};

export const hapticSuccess = () =>
    runSilently(() => Haptics.notification({ type: NotificationType.Success }));

export const hapticError = () =>
    runSilently(() => Haptics.notification({ type: NotificationType.Error }));

export const hapticSelection = () =>
    runSilently(() => Haptics.impact({ style: ImpactStyle.Light }));
