import { App } from '@capacitor/app';
import { Keyboard } from '@capacitor/keyboard';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

import { isNativeApp } from './platform';
import { restoreSessionToken } from './sessionStore';
import { stopNativeTts } from './speech';

const THEME_ATTRIBUTE = 'data-theme';

/** 플러그인 호출 실패로 앱 부팅이 막히면 안 된다. */
const runSilently = async (action) => {
    try {
        await action();
    } catch {
        // 무시
    }
};

/**
 * useThemePreference가 <html data-theme="dark|light">를 갱신하므로,
 * 그 속성을 그대로 따라가면 상태바가 앱 테마와 어긋나지 않는다.
 */
const syncStatusBarWithTheme = () => {
    const root = document.documentElement;

    const applyTheme = () => {
        const isDark = root.getAttribute(THEME_ATTRIBUTE) === 'dark';
        // Capacitor의 Style.Dark는 "어두운 배경 위의 밝은 글자"를 뜻한다.
        runSilently(() => StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light }));
    };

    applyTheme();

    const observer = new MutationObserver(applyTheme);
    observer.observe(root, { attributeFilter: [THEME_ATTRIBUTE] });
    return () => observer.disconnect();
};

/**
 * 주관식/빈칸 퀴즈처럼 입력이 화면 아래쪽에 있는 화면에서
 * 키보드 높이만큼 여백을 줄 수 있도록 CSS 변수로 노출한다.
 */
const trackKeyboardHeight = () => {
    const root = document.documentElement;
    const setHeight = (height) => root.style.setProperty('--keyboard-height', `${height}px`);

    setHeight(0);
    runSilently(() => Keyboard.setAccessoryBarVisible({ isVisible: true }));
    Keyboard.addListener('keyboardWillShow', (info) => setHeight(info?.keyboardHeight ?? 0));
    Keyboard.addListener('keyboardWillHide', () => setHeight(0));
};

/**
 * 네이티브 셸 초기화. 웹에서는 아무 것도 하지 않는다.
 * main.jsx가 렌더 전에 호출하고, 저장된 세션 토큰 복원까지 기다린다.
 */
export const bootstrapNativeApp = async () => {
    if (!isNativeApp()) return;

    // index.css의 네이티브 전용 규칙이 이 속성에 걸려 있다.
    document.documentElement.dataset.native = 'true';

    // App이 마운트되며 /api/auth/me를 부르기 전에 토큰이 메모리에 올라와 있어야 한다.
    await restoreSessionToken();

    syncStatusBarWithTheme();
    trackKeyboardHeight();

    // 백그라운드로 나가면 읽던 발음이 계속 재생되지 않도록 끊는다.
    App.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) stopNativeTts();
    });

    // launchAutoHide가 켜져 있어 이 호출이 실패해도 스플래시는 스스로 사라진다.
    // 여기서는 부팅이 빨리 끝났을 때 기다림을 줄이는 역할만 한다.
    await runSilently(() => SplashScreen.hide());
};
