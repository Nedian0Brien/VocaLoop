// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import ToeflCompleteTheWordQuiz from './ToeflCompleteTheWordQuiz';

const toeflService = vi.hoisted(() => ({
    generateCompleteTheWordSet: vi.fn(),
    generateCompleteTheWordFeedback: vi.fn(),
    generateCompleteTheWordSummary: vi.fn(),
}));

const geminiService = vi.hoisted(() => ({
    generateWordData: vi.fn(),
}));

const wordApi = vi.hoisted(() => ({
    createWord: vi.fn(),
}));

const soundEffects = vi.hoisted(() => ({
    playSound: vi.fn(),
}));

vi.mock('../services/toeflService', () => toeflService);
vi.mock('../services/geminiService', () => geminiService);
vi.mock('../services/wordApi', () => wordApi);
vi.mock('../utils/soundEffects', () => soundEffects);

describe('ToeflCompleteTheWordQuiz save flow', () => {
    let alertSpy;

    beforeEach(() => {
        alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    });

    afterEach(() => {
        cleanup();
        alertSpy?.mockRestore?.();
        vi.clearAllMocks();
    });

    test('saves an incorrect word to vocabulary via backend API', async () => {
        toeflService.generateCompleteTheWordSet.mockResolvedValue({
            questions: [
                {
                    paragraph: 'It is {{1}}.',
                    fullParagraph: 'It is cat.',
                    blanks: [{ id: 1, answer: 'cat' }],
                },
            ],
        });

        geminiService.generateWordData.mockResolvedValue({
            word: 'cat',
            meaning_ko: '고양이',
            pronunciation: '/kæt/',
            pos: 'Noun',
            definitions: ['a small domesticated animal'],
            definitions_ko: ['작은 길들여진 동물'],
            examples: [{ en: 'A cat is sleeping.', ko: '고양이가 자고 있다.' }],
            synonyms: ['feline'],
            nuance: '일상적인 단어',
        });

        wordApi.createWord.mockResolvedValue({
            id: 123,
            word: 'cat',
        });

        render(
            <ToeflCompleteTheWordQuiz
                aiConfig={{ provider: 'gemini', apiKey: 'test-key' }}
                questionCount={1}
                targetScore={80}
                onExit={() => {}}
                db={null}
                user={{ email: 'user@example.com' }}
            />
        );

        await screen.findByText('Complete-the-Word');

        fireEvent.change(screen.getByLabelText('빈칸 1의 2번째 철자'), {
            target: { value: 'x' },
        });
        fireEvent.change(screen.getByLabelText('빈칸 1의 3번째 철자'), {
            target: { value: 'y' },
        });

        fireEvent.click(screen.getByRole('button', { name: '정답 확인' }));

        await screen.findByText(/틀린 단어/);
        fireEvent.click(screen.getByRole('button', { name: '저장' }));

        await waitFor(() => {
            expect(wordApi.createWord).toHaveBeenCalledTimes(1);
        });

        expect(geminiService.generateWordData).toHaveBeenCalledWith('cat', {
            provider: 'gemini',
            apiKey: 'test-key',
        });

        expect(wordApi.createWord).toHaveBeenCalledWith({
            word: 'cat',
            meaning_ko: '고양이',
            pronunciation: '/kæt/',
            pos: 'Noun',
            definitions: ['a small domesticated animal'],
            definitions_ko: ['작은 길들여진 동물'],
            examples: [{ en: 'A cat is sleeping.', ko: '고양이가 자고 있다.' }],
            synonyms: ['feline'],
            nuance: '일상적인 단어',
            folder_id: null,
            learning_rate: 0,
            status: 'new',
            stats: { wrong_count: 0, review_count: 0 },
        });

        expect(alertSpy).toHaveBeenCalledWith("'cat' 단어를 단어장에 저장했습니다!");
        await screen.findByText('저장됨');
    });
});
