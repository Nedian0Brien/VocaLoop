import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, Brain, InfinityIcon, RotateCw, Settings } from './Icons';
import {
    MOBILE_NAV_AUTO_HIDE_RESUME_GUARD_MS,
    MOBILE_NAV_AUTO_HIDE_THRESHOLDS,
    primeMobileNavAutoHideState,
    reduceMobileNavAutoHideState,
} from './mobileNavAutoHide';

/**
 * Header — 글로벌 네비게이션 바.
 * 디자인 시스템 토큰 기반. 글래스모픽 스티키 헤더.
 *
 * NavLink 는 <a href> 로 구현 — 새 탭 열기 / 오른쪽 클릭 메뉴 지원.
 * setView(navigate) 를 onClick 에서 호출해 SPA 내비게이션도 함께 처리.
 */
const NAV_LINKS = [
    { view: 'dashboard', href: '/',       label: 'Dashboard', Icon: BookOpen },
    { view: 'study',     href: '/study',  label: 'Study',     Icon: Brain    },
    { view: 'review',    href: '/review', label: 'Review',    Icon: RotateCw },
    { view: 'settings',  href: '/settings', label: 'Settings', Icon: Settings },
];

const NavLink = ({ active, href, onClick, children }) => (
    <a
        href={href}
        onClick={(e) => { e.preventDefault(); onClick(); }}
        aria-current={active ? 'page' : undefined}
        className={[
            'relative h-9 px-3 sm:px-4 inline-flex items-center text-sm font-bold tracking-tight rounded-pill transition-all duration-150',
            active
                ? 'text-brand-700 bg-brand-50'
                : 'text-surface-500 hover:text-surface-900 hover:bg-surface-100',
        ].join(' ')}
    >
        {children}
    </a>
);

const MobileNav = ({ view, setView }) => {
    const [hidden, setHidden] = useState(false);
    const [indicatorStyle, setIndicatorStyle] = useState({ width: 0, x: 0, ready: false });
    const navRef = useRef(null);
    const itemRefs = useRef({});
    const hiddenRef = useRef(false);
    const scrollRafRef = useRef(null);

    useEffect(() => {
        const getScrollY = () => Math.max(
            window.scrollY || 0,
            document.documentElement.scrollTop || 0,
            document.body.scrollTop || 0,
        );
        const updateHidden = (nextHidden) => {
            if (hiddenRef.current === nextHidden) return;
            hiddenRef.current = nextHidden;
            setHidden(nextHidden);
        };

        let autoHideState = primeMobileNavAutoHideState({
            currentY: getScrollY(),
            now: Date.now(),
            resumeGuardMs: MOBILE_NAV_AUTO_HIDE_RESUME_GUARD_MS,
        });
        updateHidden(autoHideState.hidden);

        const updateVisibility = () => {
            autoHideState = reduceMobileNavAutoHideState({
                state: autoHideState,
                currentY: getScrollY(),
                now: Date.now(),
                isMobile: window.innerWidth < 768,
                thresholds: MOBILE_NAV_AUTO_HIDE_THRESHOLDS,
            });
            updateHidden(autoHideState.hidden);
            scrollRafRef.current = null;
        };

        const onScroll = () => {
            if (scrollRafRef.current !== null) return;
            scrollRafRef.current = window.requestAnimationFrame(updateVisibility);
        };

        const onResize = () => {
            if (scrollRafRef.current !== null) {
                window.cancelAnimationFrame(scrollRafRef.current);
                scrollRafRef.current = null;
            }
            autoHideState = {
                ...autoHideState,
                hidden: window.innerWidth < 768 ? autoHideState.hidden : false,
                lastScrollY: getScrollY(),
                resumeGuardUntil: 0,
            };
            updateHidden(autoHideState.hidden);
        };

        const onResume = () => {
            if (document.visibilityState === 'hidden') return;
            if (scrollRafRef.current !== null) {
                window.cancelAnimationFrame(scrollRafRef.current);
                scrollRafRef.current = null;
            }
            autoHideState = primeMobileNavAutoHideState({
                currentY: getScrollY(),
                now: Date.now(),
                resumeGuardMs: MOBILE_NAV_AUTO_HIDE_RESUME_GUARD_MS,
            });
            updateHidden(autoHideState.hidden);
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onResize);
        window.addEventListener('focus', onResume);
        window.addEventListener('pageshow', onResume);
        document.addEventListener('visibilitychange', onResume);

        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onResize);
            window.removeEventListener('focus', onResume);
            window.removeEventListener('pageshow', onResume);
            document.removeEventListener('visibilitychange', onResume);
            if (scrollRafRef.current !== null) {
                window.cancelAnimationFrame(scrollRafRef.current);
                scrollRafRef.current = null;
            }
        };
    }, [view]);

    const syncIndicator = useCallback(() => {
        const nav = navRef.current;
        const activeItem = itemRefs.current[view];
        if (!nav || !activeItem) return;

        const navRect = nav.getBoundingClientRect();
        const itemRect = activeItem.getBoundingClientRect();
        const width = Math.round(itemRect.width);
        const x = Math.round(itemRect.left - navRect.left - 4);

        setIndicatorStyle((previous) => {
            if (previous.ready && previous.width === width && previous.x === x) return previous;
            return { width, x, ready: true };
        });
    }, [view]);

    useEffect(() => {
        const raf = window.requestAnimationFrame(syncIndicator);
        const handleViewportChange = () => {
            window.requestAnimationFrame(syncIndicator);
        };

        window.addEventListener('resize', handleViewportChange);
        window.addEventListener('orientationchange', handleViewportChange);

        return () => {
            window.cancelAnimationFrame(raf);
            window.removeEventListener('resize', handleViewportChange);
            window.removeEventListener('orientationchange', handleViewportChange);
        };
    }, [syncIndicator]);

    return (
        <nav
            ref={navRef}
            aria-label="모바일 주요 메뉴"
            className={[
                'fixed left-1/2 z-40 grid h-16 w-[min(25rem,calc(100vw-2rem))] -translate-x-1/2 grid-cols-4 overflow-hidden rounded-pill border border-surface-200/80 bg-white/85 p-1 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.55),var(--shadow-floating)] backdrop-blur-2xl backdrop-saturate-[1.8] transition-[bottom,opacity] duration-[280ms] ease-[var(--ease-decel)] will-change-[bottom,opacity] [backface-visibility:hidden] [transform-style:preserve-3d] md:hidden',
                hidden
                    ? 'bottom-[calc(-4rem-1.75rem-env(safe-area-inset-bottom))] pointer-events-none opacity-0'
                    : 'bottom-[calc(1rem+env(safe-area-inset-bottom))] opacity-100',
            ].join(' ')}
        >
            <span
                data-testid="mobile-nav-indicator"
                aria-hidden="true"
                className="absolute left-1 top-1 bottom-1 z-0 rounded-pill border border-brand-100 bg-white shadow-[var(--shadow-soft)] transition-[transform,width,opacity] duration-300 ease-[var(--ease-spring)]"
                style={{
                    width: `${indicatorStyle.width}px`,
                    transform: `translateX(${indicatorStyle.x}px)`,
                    opacity: indicatorStyle.ready ? 1 : 0,
                }}
            />
            {NAV_LINKS.map(({ view: v, href, label, Icon }) => {
                const active = view === v;
                return (
                    <a
                        key={v}
                        ref={(element) => {
                            itemRefs.current[v] = element;
                        }}
                        href={href}
                        onClick={(e) => { e.preventDefault(); setView(v); }}
                        aria-current={active ? 'page' : undefined}
                        data-mobile-nav-item="true"
                        data-mobile-nav-key={v}
                        className={[
                            'relative z-10 flex min-w-0 select-none flex-col items-center justify-center gap-0.5 rounded-pill border-0 bg-transparent px-2 text-[11px] font-black tracking-tight transition-colors duration-150 [touch-action:manipulation] [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none]',
                            active
                                ? 'text-brand-700'
                                : 'text-surface-500 hover:text-surface-900',
                        ].join(' ')}
                    >
                        <Icon className="h-5 w-5" aria-hidden="true" />
                        <span className="truncate">{label}</span>
                    </a>
                );
            })}
        </nav>
    );
};

const Header = ({ view, setView, user }) => (
    <>
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-surface-100">
            <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
                <a
                    href="/"
                    onClick={(e) => { e.preventDefault(); setView('dashboard'); }}
                    className="flex items-center gap-2.5 text-brand-700 group"
                    aria-label="VocaLoop 홈"
                >
                    <div className="relative w-9 h-9 rounded-md bg-gradient-to-br from-brand-500 to-indigo-pair-600 grid place-items-center shadow-[var(--shadow-glow-brand)] transition-transform duration-300 group-hover:scale-105">
                        <InfinityIcon className="w-5 h-5 text-white" strokeWidth={3} />
                    </div>
                    <h1 className="text-xl font-black tracking-tight">VocaLoop</h1>
                </a>

                <div className="flex items-center gap-2 min-w-0">
                    <nav className="hidden items-center gap-1 overflow-x-auto md:flex" aria-label="데스크톱 주요 메뉴">
                        {NAV_LINKS.map(({ view: v, href, label }) => (
                            <NavLink
                                key={v}
                                active={view === v}
                                href={href}
                                onClick={() => setView(v)}
                            >
                                {label}
                            </NavLink>
                        ))}
                    </nav>

                    {user && (
                        <div className="flex items-center pl-2 sm:pl-3 ml-1 border-l border-surface-200">
                            <button
                                type="button"
                                onClick={() => setView('settings')}
                                className={[
                                    'flex items-center gap-2 group rounded-pill p-1 transition-colors',
                                    view === 'settings' ? 'bg-brand-50' : 'hover:bg-surface-100',
                                ].join(' ')}
                                title="계정 설정"
                                aria-label="계정 설정으로 이동"
                            >
                                {user.photoURL ? (
                                    <img
                                        src={user.photoURL}
                                        alt=""
                                        className={[
                                            'w-8 h-8 rounded-pill border-2 transition-colors',
                                            view === 'settings' ? 'border-brand-500' : 'border-surface-200 group-hover:border-brand-500',
                                        ].join(' ')}
                                    />
                                ) : (
                                    <div
                                        className={[
                                            'w-8 h-8 rounded-pill bg-gradient-to-br from-brand-500 to-indigo-pair-600 grid place-items-center text-white font-black text-sm border-2 transition-colors',
                                            view === 'settings' ? 'border-brand-500' : 'border-surface-200 group-hover:border-brand-500',
                                        ].join(' ')}
                                    >
                                        {user.displayName?.charAt(0) || user.email?.charAt(0)?.toUpperCase() || 'U'}
                                    </div>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
        <MobileNav view={view} setView={setView} />
    </>
);

export default Header;
