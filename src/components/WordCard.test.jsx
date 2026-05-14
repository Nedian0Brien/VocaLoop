// @vitest-environment jsdom

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('./LearningRateDonut', () => ({
    default: () => <div>learning-rate-donut</div>,
    LearningStatusBadge: () => <div>learning-status-badge</div>,
}));

import WordCard from './WordCard';

const baseWord = {
    id: 1,
    word: 'detrimental',
    pos: 'adjective',
    pronunciation: '/detrimental/',
    definition: 'causing harm',
    example: 'A detrimental effect.',
    learningRate: 0,
};

describe('WordCard visual layers', () => {
    beforeEach(() => {
        Object.defineProperty(window, 'speechSynthesis', {
            configurable: true,
            value: {
                getVoices: vi.fn(() => []),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                speak: vi.fn(),
            },
        });
    });

    afterEach(() => {
        cleanup();
    });

    test('keeps hover glow layers on the same radius contract as the card face', () => {
        render(
            <WordCard
                item={baseWord}
                handleDeleteWord={vi.fn()}
                folders={[]}
                onMoveWord={vi.fn()}
                onRegenerateWord={vi.fn()}
            />
        );

        expect(screen.getByTestId('word-card-shell').dataset.radiusContract).toBe('shell');

        const layers = screen.getAllByTestId('word-card-radius-layer');
        expect(layers.length).toBeGreaterThanOrEqual(4);
        layers.forEach((layer) => {
            expect(layer.dataset.radiusContract).toBe('shell');
        });
    });
});
