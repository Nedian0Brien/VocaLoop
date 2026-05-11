import React from 'react';
import { InfinityIcon, Settings } from './Icons';

/**
 * Header — 글로벌 네비게이션 바.
 * 디자인 시스템 토큰 기반. 글래스모픽 스티키 헤더.
 *
 * NavLink 는 <a href> 로 구현 — 새 탭 열기 / 오른쪽 클릭 메뉴 지원.
 * setView(navigate) 를 onClick 에서 호출해 SPA 내비게이션도 함께 처리.
 */
const NAV_LINKS = [
    { view: 'dashboard', href: '/',      label: 'Dashboard' },
    { view: 'study',     href: '/study', label: 'Study'     },
];

const NavLink = ({ active, href, onClick, children }) => (
    <a
        href={href}
        onClick={(e) => { e.preventDefault(); onClick(); }}
        aria-current={active ? 'page' : undefined}
        className={[
            'relative h-9 px-4 inline-flex items-center text-sm font-bold tracking-tight rounded-pill transition-all duration-150',
            active
                ? 'text-brand-700 bg-brand-50'
                : 'text-surface-500 hover:text-surface-900 hover:bg-surface-100',
        ].join(' ')}
    >
        {children}
    </a>
);

const Header = ({ view, setView, user, onOpenSettings }) => (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-lg border-b border-surface-100">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
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

            <div className="flex items-center gap-2">
                <nav className="flex items-center gap-1" aria-label="주요 메뉴">
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
                    <div className="flex items-center pl-3 ml-1 border-l border-surface-200">
                        <button
                            onClick={onOpenSettings}
                            className="flex items-center gap-2 group rounded-pill p-1 hover:bg-surface-100 transition-colors"
                            title="계정 설정"
                            aria-label="계정 설정 열기"
                        >
                            {user.photoURL ? (
                                <img
                                    src={user.photoURL}
                                    alt=""
                                    className="w-8 h-8 rounded-pill border-2 border-surface-200 group-hover:border-brand-500 transition-colors"
                                />
                            ) : (
                                <div className="w-8 h-8 rounded-pill bg-gradient-to-br from-brand-500 to-indigo-pair-600 grid place-items-center text-white font-black text-sm border-2 border-surface-200 group-hover:border-brand-500 transition-colors">
                                    {user.displayName?.charAt(0) || user.email?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                            )}
                            <Settings className="w-4 h-4 text-surface-400 group-hover:text-brand-600 transition-colors" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    </header>
);

export default Header;
