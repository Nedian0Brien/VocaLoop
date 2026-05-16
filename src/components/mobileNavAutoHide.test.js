import { describe, expect, test } from 'vitest';

import {
    primeMobileNavAutoHideState,
    reduceMobileNavAutoHideState,
} from './mobileNavAutoHide';

describe('mobileNavAutoHide', () => {
    const thresholds = {
        nearTopThreshold: 32,
        hideAfterScrollY: 72,
        hideDeltaThreshold: 8,
        revealDeltaThreshold: 8,
    };

    test('hides after downward mobile scroll passes the thresholds', () => {
        const next = reduceMobileNavAutoHideState({
            state: { hidden: false, lastScrollY: 80, resumeGuardUntil: 0 },
            currentY: 96,
            now: 1000,
            isMobile: true,
            thresholds,
        });

        expect(next.hidden).toBe(true);
        expect(next.lastScrollY).toBe(96);
    });

    test('reveals on upward scroll and near the page top', () => {
        const upward = reduceMobileNavAutoHideState({
            state: { hidden: true, lastScrollY: 180, resumeGuardUntil: 0 },
            currentY: 160,
            now: 1000,
            isMobile: true,
            thresholds,
        });

        expect(upward.hidden).toBe(false);

        const nearTop = reduceMobileNavAutoHideState({
            state: { hidden: true, lastScrollY: 80, resumeGuardUntil: 0 },
            currentY: 12,
            now: 1000,
            isMobile: true,
            thresholds,
        });

        expect(nearTop.hidden).toBe(false);
    });

    test('forces visibility on desktop and during resume guard', () => {
        const desktop = reduceMobileNavAutoHideState({
            state: { hidden: true, lastScrollY: 80, resumeGuardUntil: 0 },
            currentY: 220,
            now: 1000,
            isMobile: false,
            thresholds,
        });

        expect(desktop.hidden).toBe(false);
        expect(desktop.resumeGuardUntil).toBe(0);

        const resumed = primeMobileNavAutoHideState({
            currentY: 420,
            now: 2000,
            resumeGuardMs: 240,
        });

        expect(resumed).toEqual({
            hidden: false,
            lastScrollY: 420,
            resumeGuardUntil: 2240,
        });

        const guarded = reduceMobileNavAutoHideState({
            state: resumed,
            currentY: 860,
            now: 2100,
            isMobile: true,
            thresholds,
        });

        expect(guarded.hidden).toBe(false);
        expect(guarded.lastScrollY).toBe(860);
    });
});
