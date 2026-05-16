// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import Header from './Header';

const user = {
    email: 'learner@example.com',
    displayName: 'Learner',
};

describe('Header mobile navigation', () => {
    test('renders an ARIS-style floating mobile nav adapted to VocaLoop views', () => {
        const setView = vi.fn();

        render(<Header view="study" setView={setView} user={user} onOpenSettings={vi.fn()} />);

        const mobileNav = screen.getByRole('navigation', { name: '모바일 주요 메뉴' });
        expect(mobileNav.className).toContain('fixed');
        expect(mobileNav.className).toContain('md:hidden');

        const desktopNav = screen.getByRole('navigation', { name: '데스크톱 주요 메뉴' });
        expect(desktopNav.className).toContain('hidden');
        expect(desktopNav.className).toContain('md:flex');

        const mobileLinks = ['Dashboard', 'Study', 'Review'].map((label) =>
            within(mobileNav).getByRole('link', { name: label })
        );
        expect(mobileLinks).toHaveLength(3);
        expect(mobileLinks[1].getAttribute('aria-current')).toBe('page');
        expect(screen.getByTestId('mobile-nav-indicator').style.transform).toBe('translateX(100%)');

        fireEvent.click(mobileLinks[2]);

        expect(setView).toHaveBeenCalledWith('review');
    });
});
