// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
    THEME_MODE_STORAGE_KEY,
    getNextThemeMode,
    resolveThemeMode,
    useThemePreference,
} from './useThemePreference';

const createMatchMedia = ({ matches = false } = {}) => {
    const listeners = new Set();
    const mediaQueryList = {
        matches,
        media: '(prefers-color-scheme: dark)',
        addEventListener: vi.fn((event, listener) => {
            if (event === 'change') listeners.add(listener);
        }),
        removeEventListener: vi.fn((event, listener) => {
            if (event === 'change') listeners.delete(listener);
        }),
        dispatch(nextMatches) {
            this.matches = nextMatches;
            listeners.forEach((listener) => listener({ matches: nextMatches }));
        },
    };

    return vi.fn(() => mediaQueryList);
};

const ThemeProbe = () => {
    const { themeMode, resolvedTheme, setThemeMode } = useThemePreference();

    return (
        <button type="button" onClick={() => setThemeMode('dark')}>
            {themeMode}:{resolvedTheme}
        </button>
    );
};

describe('useThemePreference', () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.removeAttribute('data-theme');
        document.documentElement.removeAttribute('data-theme-mode');
        document.documentElement.style.colorScheme = '';
        window.matchMedia = createMatchMedia({ matches: true });
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    test('cycles through system, light, and dark modes', () => {
        expect(getNextThemeMode('system')).toBe('light');
        expect(getNextThemeMode('light')).toBe('dark');
        expect(getNextThemeMode('dark')).toBe('system');
        expect(getNextThemeMode('unexpected')).toBe('system');
    });

    test('resolves system mode from the operating system preference', () => {
        expect(resolveThemeMode('system', true)).toBe('dark');
        expect(resolveThemeMode('system', false)).toBe('light');
        expect(resolveThemeMode('dark', false)).toBe('dark');
        expect(resolveThemeMode('light', true)).toBe('light');
    });

    test('applies the resolved system preference to the document element', () => {
        render(<ThemeProbe />);

        expect(screen.getByRole('button', { name: 'system:dark' })).toBeTruthy();
        expect(document.documentElement.dataset.themeMode).toBe('system');
        expect(document.documentElement.dataset.theme).toBe('dark');
        expect(document.documentElement.style.colorScheme).toBe('dark');
    });

    test('persists an explicit selected mode and applies it immediately', () => {
        render(<ThemeProbe />);

        fireEvent.click(screen.getByRole('button'));

        expect(localStorage.getItem(THEME_MODE_STORAGE_KEY)).toBe('dark');
        expect(document.documentElement.dataset.themeMode).toBe('dark');
        expect(document.documentElement.dataset.theme).toBe('dark');
    });
});
