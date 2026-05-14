// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const toeflAssetApi = vi.hoisted(() => ({
    listToeflAssets: vi.fn(),
    getToeflAsset: vi.fn(),
}));

const toeflReviewApi = vi.hoisted(() => ({
    listToeflReviewItems: vi.fn(),
    updateToeflReviewItem: vi.fn(),
}));

vi.mock('../services/toeflAssetApi', () => toeflAssetApi);
vi.mock('../services/toeflReviewApi', () => toeflReviewApi);

import ToeflReviewView from './ToeflReviewView';

const reviewItem = {
    id: 11,
    assetId: 7,
    attemptId: 3,
    mode: 'toefl-daily-life',
    taskType: 'daily-life',
    itemKey: 'toefl-daily-life:q1',
    title: 'Campus Schedule',
    prompt: 'When is the workshop?',
    userAnswer: 'Monday',
    correctAnswer: 'Wednesday',
    explanation: 'moved from Monday to Wednesday',
    sourceSnapshot: { stimulus: 'The workshop moved from Monday to Wednesday.' },
    skillTag: 'detail',
    topicTags: ['campus'],
    status: 'new',
    dueAt: new Date(Date.now() - 1000).toISOString(),
    reviewCount: 0,
    successStreak: 0,
    lastResult: 'wrong',
};

const savedAsset = {
    id: 7,
    mode: 'toefl-daily-life',
    taskType: 'daily-life',
    title: 'Campus Notice Review',
    payload: {
        taskType: 'daily-life',
        title: 'Campus Notice Review',
        stimulus: 'The pool will close early.',
        questions: [],
    },
    metadata: { targetScore: 100, questionCount: 1 },
    createdAt: '2026-05-12T00:00:00Z',
};

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('ToeflReviewView', () => {
    beforeEach(() => {
        toeflAssetApi.listToeflAssets.mockResolvedValue([]);
        toeflAssetApi.getToeflAsset.mockResolvedValue(null);
        toeflReviewApi.listToeflReviewItems.mockResolvedValue([]);
        toeflReviewApi.updateToeflReviewItem.mockResolvedValue(null);
    });

    test('opens due review items and records review progress', async () => {
        toeflReviewApi.listToeflReviewItems.mockResolvedValue([reviewItem]);
        toeflReviewApi.updateToeflReviewItem.mockResolvedValue({
            ...reviewItem,
            status: 'reviewing',
            dueAt: new Date(Date.now() + 86400000).toISOString(),
            reviewCount: 1,
            successStreak: 1,
            lastResult: 'correct',
        });

        render(<ToeflReviewView onStartAssetReview={vi.fn()} />);

        await screen.findByText('Campus Schedule');
        fireEvent.click(screen.getByRole('button', { name: 'Campus Schedule 오답 복습' }));

        expect(screen.getByRole('heading', { name: 'When is the workshop?' })).toBeTruthy();
        expect(screen.getByText('Monday')).toBeTruthy();
        expect(screen.getByText('Wednesday')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: '이해 완료' }));
        await waitFor(() => {
            expect(toeflReviewApi.updateToeflReviewItem).toHaveBeenCalledWith(11, { result: 'correct' });
        });
    });

    test('starts a saved TOEFL asset from the Review tab', async () => {
        const onStartAssetReview = vi.fn();
        toeflAssetApi.listToeflAssets.mockResolvedValue([savedAsset]);

        render(<ToeflReviewView onStartAssetReview={onStartAssetReview} />);

        fireEvent.click(await screen.findByRole('tab', { name: /Saved 1/ }));
        await screen.findByText('Campus Notice Review');
        fireEvent.click(screen.getByRole('button', { name: 'Campus Notice Review 복습하기' }));

        await waitFor(() => {
            expect(onStartAssetReview).toHaveBeenCalledWith(savedAsset);
        });
    });
});
