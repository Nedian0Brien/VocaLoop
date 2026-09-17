// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import AiConversationList, { groupConversations } from './AiConversationList';

const conversation = (id, title, updatedAt) => ({ id, title, created_at: updatedAt, updated_at: updatedAt });

describe('groupConversations', () => {
    test('buckets by today, yesterday and earlier in list order', () => {
        // 서버 시각은 UTC 로 읽힌다. 머신 타임존과 무관하게 now 기준으로 시각을 만든다.
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const iso = (ms) => new Date(ms).toISOString().replace('Z', '');
        const groups = groupConversations(
            [
                conversation(3, 'c', iso(now.getTime() - 60_000)),
                conversation(2, 'b', iso(startOfToday - 60_000)),
                conversation(1, 'a', iso(now.getTime() - 10 * 86_400_000)),
            ],
            now,
        );

        expect(groups.map((group) => [group.label, group.items.map((item) => item.id)])).toEqual([
            ['오늘', [3]],
            ['어제', [2]],
            ['이전', [1]],
        ]);
    });
});

describe('AiConversationList', () => {
    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    const renderList = (props = {}) => {
        const handlers = {
            onDelete: vi.fn(),
            onRename: vi.fn(async () => true),
            onSelect: vi.fn(),
            onStartNew: vi.fn(),
        };
        render(
            <AiConversationList
                activeConversationId={2}
                conversations={[
                    conversation(2, 'TOEFL 단어장', '2026-09-17T09:00:00'),
                    conversation(1, '', '2026-09-01T10:00:00'),
                ]}
                {...handlers}
                {...props}
            />,
        );
        return handlers;
    };

    test('renders new-chat, search, grouped items and marks the active one', () => {
        renderList();

        expect(screen.getByRole('button', { name: '새 대화 시작' })).toBeTruthy();
        expect(screen.getByLabelText('대화 검색')).toBeTruthy();
        expect(screen.getByText('오늘')).toBeTruthy();
        expect(screen.getByText('이전')).toBeTruthy();
        expect(screen.getByRole('button', { name: /^TOEFL 단어장(?! 메뉴)/ }).textContent).toContain('대화 ·');
        expect(screen.getByRole('button', { name: /^TOEFL 단어장(?! 메뉴)/ }).getAttribute('aria-current')).toBe('true');
        expect(screen.getByRole('button', { name: '새 대화 시작' }).getAttribute('data-active')).toBeNull();
    });

    test('filters by title and selects on click', () => {
        const { onSelect } = renderList();

        fireEvent.change(screen.getByLabelText('대화 검색'), { target: { value: 'toefl' } });
        expect(screen.getByRole('button', { name: '새 대화 시작' })).toBeTruthy();
        expect(screen.queryByText('이전')).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: /^TOEFL 단어장(?! 메뉴)/ }));
        expect(onSelect).toHaveBeenCalledWith(2);
    });

    test('renames through the item menu and commits on Enter', async () => {
        const { onRename } = renderList();

        fireEvent.click(screen.getByRole('button', { name: 'TOEFL 단어장 메뉴' }));
        fireEvent.click(screen.getByRole('menuitem', { name: '이름 바꾸기' }));

        const input = screen.getByLabelText('대화 이름');
        fireEvent.change(input, { target: { value: '  새 이름  ' } });
        fireEvent.keyDown(input, { key: 'Enter' });

        expect(onRename).toHaveBeenCalledWith(2, '새 이름');
    });

    test('deletes through the item menu after confirmation', () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        const { onDelete } = renderList();

        fireEvent.click(screen.getByRole('button', { name: '새 대화 메뉴' }));
        fireEvent.click(screen.getByRole('menuitem', { name: '삭제' }));

        expect(window.confirm).toHaveBeenCalled();
        expect(onDelete).toHaveBeenCalledWith(1);
    });
});
