export const MOBILE_NAV_AUTO_HIDE_RESUME_GUARD_MS = 240;

export const MOBILE_NAV_AUTO_HIDE_THRESHOLDS = {
    nearTopThreshold: 32,
    hideAfterScrollY: 72,
    hideDeltaThreshold: 8,
    revealDeltaThreshold: 8,
};

export function primeMobileNavAutoHideState({ currentY, now, resumeGuardMs }) {
    return {
        hidden: false,
        lastScrollY: currentY,
        resumeGuardUntil: now + Math.max(0, resumeGuardMs),
    };
}

export function reduceMobileNavAutoHideState({
    state,
    currentY,
    now,
    isMobile,
    thresholds = MOBILE_NAV_AUTO_HIDE_THRESHOLDS,
}) {
    if (!isMobile) {
        return {
            hidden: false,
            lastScrollY: currentY,
            resumeGuardUntil: 0,
        };
    }

    if (now < state.resumeGuardUntil) {
        return {
            ...state,
            hidden: false,
            lastScrollY: currentY,
        };
    }

    const delta = currentY - state.lastScrollY;
    let hidden = state.hidden;

    if (currentY < thresholds.nearTopThreshold) {
        hidden = false;
    } else if (delta > thresholds.hideDeltaThreshold && currentY > thresholds.hideAfterScrollY) {
        hidden = true;
    } else if (delta < -thresholds.revealDeltaThreshold) {
        hidden = false;
    }

    return {
        hidden,
        lastScrollY: currentY,
        resumeGuardUntil: state.resumeGuardUntil,
    };
}
