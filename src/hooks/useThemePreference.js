import { useCallback, useEffect, useMemo, useState } from 'react';

export const THEME_MODE_STORAGE_KEY = 'vocaloop.themeMode';
export const THEME_MODES = ['system', 'light', 'dark'];

const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)';

const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined';

const isThemeMode = (mode) => THEME_MODES.includes(mode);

const getSystemPrefersDark = () => {
    if (!isBrowser() || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia(DARK_MEDIA_QUERY).matches;
};

export const getNextThemeMode = (themeMode) => {
    if (themeMode === 'system') return 'light';
    if (themeMode === 'light') return 'dark';
    if (themeMode === 'dark') return 'system';
    return 'system';
};

export const resolveThemeMode = (themeMode, prefersDark) => {
    if (themeMode === 'light' || themeMode === 'dark') return themeMode;
    return prefersDark ? 'dark' : 'light';
};

const readStoredThemeMode = () => {
    if (!isBrowser()) return 'system';

    try {
        const stored = window.localStorage.getItem(THEME_MODE_STORAGE_KEY);
        return isThemeMode(stored) ? stored : 'system';
    } catch {
        return 'system';
    }
};

const persistThemeMode = (themeMode) => {
    if (!isBrowser()) return;

    try {
        if (themeMode === 'system') {
            window.localStorage.removeItem(THEME_MODE_STORAGE_KEY);
        } else {
            window.localStorage.setItem(THEME_MODE_STORAGE_KEY, themeMode);
        }
    } catch {
        // Private browsing or locked storage should not block theme changes.
    }
};

export const useThemePreference = () => {
    const [themeMode, setThemeModeState] = useState(readStoredThemeMode);
    const [prefersDark, setPrefersDark] = useState(getSystemPrefersDark);
    const resolvedTheme = useMemo(
        () => resolveThemeMode(themeMode, prefersDark),
        [prefersDark, themeMode],
    );

    const setThemeMode = useCallback((nextThemeMode) => {
        setThemeModeState((previousThemeMode) => {
            const value = typeof nextThemeMode === 'function'
                ? nextThemeMode(previousThemeMode)
                : nextThemeMode;

            return isThemeMode(value) ? value : 'system';
        });
    }, []);

    const cycleThemeMode = useCallback(() => {
        setThemeMode((currentThemeMode) => getNextThemeMode(currentThemeMode));
    }, [setThemeMode]);

    useEffect(() => {
        if (!isBrowser() || typeof window.matchMedia !== 'function') return undefined;

        const mediaQuery = window.matchMedia(DARK_MEDIA_QUERY);
        const syncPreference = (event) => setPrefersDark(Boolean(event.matches));

        setPrefersDark(mediaQuery.matches);

        if (typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', syncPreference);
            return () => mediaQuery.removeEventListener('change', syncPreference);
        }

        if (typeof mediaQuery.addListener === 'function') {
            mediaQuery.addListener(syncPreference);
            return () => mediaQuery.removeListener(syncPreference);
        }

        return undefined;
    }, []);

    useEffect(() => {
        if (!isBrowser()) return;

        const root = document.documentElement;
        root.dataset.themeMode = themeMode;
        root.dataset.theme = resolvedTheme;
        root.style.colorScheme = resolvedTheme;
        persistThemeMode(themeMode);
    }, [resolvedTheme, themeMode]);

    return {
        themeMode,
        resolvedTheme,
        setThemeMode,
        cycleThemeMode,
    };
};

export default useThemePreference;
