// @vitest-environment jsdom

import React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import Header from './Header';

const user = {
    email: 'learner@example.com',
    displayName: 'Learner',
};

describe('Header mobile navigation', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        cleanup();
        Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });
        Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
    });

    test('renders an ARIS-style floating mobile nav adapted to VocaLoop views', () => {
        const setView = vi.fn();

        render(<Header view="study" setView={setView} user={user} onOpenSettings={vi.fn()} />);

        const mobileNav = screen.getByRole('navigation', { name: '모바일 주요 메뉴' });
        expect(mobileNav.className).toContain('fixed');
        expect(mobileNav.className).toContain('md:hidden');

        const desktopNav = screen.getByRole('navigation', { name: '데스크톱 주요 메뉴' });
        expect(desktopNav.className).toContain('hidden');
        expect(desktopNav.className).toContain('md:flex');

        const mobileLinks = ['Dashboard', 'Study', 'Review', 'Settings'].map((label) =>
            within(mobileNav).getByRole('link', { name: label })
        );
        expect(mobileLinks).toHaveLength(4);
        expect(mobileLinks[1].getAttribute('aria-current')).toBe('page');
        expect(screen.getByTestId('mobile-nav-indicator')).toBeTruthy();

        fireEvent.click(mobileLinks[3]);

        expect(setView).toHaveBeenCalledWith('settings');
    });

    test('hides on downward mobile scroll and reveals on upward scroll', () => {
        Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true });
        Object.defineProperty(window, 'scrollY', { value: 80, configurable: true });
        vi.spyOn(Date, 'now')
            .mockReturnValueOnce(1000)
            .mockReturnValueOnce(1300)
            .mockReturnValueOnce(1400);
        const rafCallbacks = [];
        vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
            rafCallbacks.push(callback);
            return rafCallbacks.length;
        });
        vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

        render(<Header view="study" setView={vi.fn()} user={user} onOpenSettings={vi.fn()} />);

        const mobileNav = screen.getByRole('navigation', { name: '모바일 주요 메뉴' });
        expect(mobileNav.className).not.toContain('pointer-events-none');
        act(() => {
            while (rafCallbacks.length > 0) rafCallbacks.shift()();
        });

        Object.defineProperty(window, 'scrollY', { value: 96, configurable: true });
        fireEvent.scroll(window);
        act(() => {
            rafCallbacks.shift()();
        });

        expect(mobileNav.className).toContain('pointer-events-none');
        expect(mobileNav.className).toContain('opacity-0');

        Object.defineProperty(window, 'scrollY', { value: 70, configurable: true });
        fireEvent.scroll(window);
        act(() => {
            rafCallbacks.shift()();
        });

        expect(mobileNav.className).not.toContain('pointer-events-none');
        expect(mobileNav.className).toContain('opacity-100');
    });

    test('measures the active mobile tab for the indicator instead of using fixed thirds', () => {
        const rects = {
            nav: { left: 10, width: 390 },
            dashboard: { left: 14, width: 90 },
            study: { left: 116, width: 120 },
            review: { left: 246, width: 150 },
            settings: { left: 320, width: 76 },
        };
        vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
            callback();
            return 1;
        });
        vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
        vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function getRect() {
            const key = this.getAttribute('data-mobile-nav-key') || 'nav';
            const rect = rects[key] || rects.nav;
            return {
                x: rect.left,
                y: 0,
                left: rect.left,
                top: 0,
                right: rect.left + rect.width,
                bottom: 64,
                width: rect.width,
                height: 64,
                toJSON: () => rect,
            };
        });

        render(<Header view="settings" setView={vi.fn()} user={user} onOpenSettings={vi.fn()} />);

        const indicator = screen.getByTestId('mobile-nav-indicator');

        expect(indicator.style.width).toBe('76px');
        expect(indicator.style.transform).toBe('translateX(306px)');
        expect(indicator.style.opacity).toBe('1');
    });
});
