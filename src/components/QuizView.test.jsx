// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

vi.mock('./MultipleChoiceQuiz', () => ({
    default: ({ onAnswer }) => (
        <div>
            multiple-choice-quiz
            <button type="button" onClick={() => onAnswer(true)}>answer-correct</button>
        </div>
    ),
}));

vi.mock('./ShortAnswerQuiz', () => ({
    default: ({ onAnswer }) => (
        <div>
            short-answer-quiz
            <button type="button" onClick={() => onAnswer(true)}>answer-correct</button>
        </div>
    ),
}));

vi.mock('./CompleteWordQuiz', () => ({
    default: ({ onAnswer }) => (
        <div>
            complete-word-quiz
            <button type="button" onClick={() => onAnswer(true)}>answer-correct</button>
        </div>
    ),
}));

vi.mock('./QuizResult', () => ({
    default: () => <div>quiz-result</div>,
}));

vi.mock('./ToeflCompleteTheWordQuiz', () => ({
    default: () => <div>toefl-complete-quiz</div>,
}));

vi.mock('./ToeflBuildSentenceQuiz', () => ({
    default: () => <div>toefl-build-quiz</div>,
}));

vi.mock('../utils/soundEffects', () => ({
    playSound: vi.fn(),
}));

import QuizView from './QuizView';

afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.restoreAllMocks();
});

describe('QuizView', () => {
    test('renders the study dashboard and enters quiz mode', () => {
        const setView = vi.fn();
        const setAiMode = vi.fn();
        const onUpdateLearningRate = vi.fn();

        render(
            <QuizView
                words={[
                    {
                        id: 1,
                        word: 'serendipity',
                        learningRate: 0,
                        createdAt: '2026-04-01T00:00:00Z',
                        stats: { wrong_count: 0, review_count: 0 },
                    },
                ]}
                setView={setView}
                db={null}
                user={{ id: 1 }}
                aiMode={false}
                setAiMode={setAiMode}
                aiConfig={{ provider: 'gemini', model: 'gemini-2.0-flash', geminiApiKey: 'test-key' }}
                folders={[]}
                selectedFolderId={null}
                onSelectFolder={vi.fn()}
                onUpdateLearningRate={onUpdateLearningRate}
            />
        );

        fireEvent.click(screen.getByText('객관식 퀴즈'));
        fireEvent.click(screen.getByRole('button', { name: '퀴즈 시작하기' }));

        expect(screen.getByText('Sound: On')).toBeTruthy();
        expect(screen.getByText('multiple-choice-quiz')).toBeTruthy();
    });

    test('advances mixed quiz through selected difficulty stages', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.9);

        render(
            <QuizView
                words={[
                    {
                        id: 1,
                        word: 'serendipity',
                        meaning_ko: '뜻밖의 발견',
                        learningRate: 0,
                        createdAt: '2026-04-01T00:00:00Z',
                        stats: { wrong_count: 0, review_count: 0 },
                    },
                ]}
                setView={vi.fn()}
                user={{ id: 1 }}
                aiMode={true}
                setAiMode={vi.fn()}
                aiConfig={{ provider: 'gemini', model: 'gemini-2.0-flash', apiKey: 'test-key' }}
                folders={[]}
                onUpdateLearningRate={vi.fn()}
            />
        );

        fireEvent.click(screen.getByText('AI 복합 퀴즈'));
        fireEvent.click(screen.getByRole('button', { name: '퀴즈 시작하기' }));

        expect(screen.getByText('multiple-choice-quiz')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'answer-correct' }));
        expect(screen.getByText('short-answer-quiz')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'answer-correct' }));
        expect(screen.getByText('complete-word-quiz')).toBeTruthy();
    });

    test('pauses mixed quiz after each five-word study set and continues to the next set', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.9);

        const words = Array.from({ length: 6 }, (_, index) => ({
            id: index + 1,
            word: `word-${index + 1}`,
            meaning_ko: `뜻 ${index + 1}`,
            learningRate: 0,
            createdAt: '2026-04-01T00:00:00Z',
            stats: { wrong_count: 0, review_count: 0 },
        }));

        render(
            <QuizView
                words={words}
                setView={vi.fn()}
                user={{ id: 1 }}
                aiMode={false}
                setAiMode={vi.fn()}
                aiConfig={{ provider: 'gemini', model: 'gemini-2.0-flash', apiKey: 'test-key' }}
                folders={[]}
                onUpdateLearningRate={vi.fn()}
            />
        );

        fireEvent.click(screen.getByText('AI 복합 퀴즈'));
        fireEvent.click(screen.getByRole('button', { name: '퀴즈 시작하기' }));

        for (let i = 0; i < 15; i += 1) {
            fireEvent.click(screen.getByRole('button', { name: 'answer-correct' }));
        }

        expect(screen.getByRole('heading', { name: '학습 세트 1 완료' })).toBeTruthy();
        expect(screen.getByRole('button', { name: '다음 학습으로' })).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: '다음 학습으로' }));
        expect(screen.queryByRole('heading', { name: '학습 세트 1 완료' })).toBeNull();
        expect(screen.getByText(/-quiz$/)).toBeTruthy();
    });
});
