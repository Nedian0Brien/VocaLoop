// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const toeflAssetApi = vi.hoisted(() => ({
    createToeflAsset: vi.fn(),
    createToeflAttempt: vi.fn(),
    getToeflAsset: vi.fn(),
    listToeflAssets: vi.fn(),
}));

vi.mock('./MultipleChoiceQuiz', () => ({
    default: ({ word, onAnswer }) => {
        const [answered, setAnswered] = React.useState(false);
        return (
            <div>
                multiple-choice-quiz
                <span data-testid="current-quiz-word">{word?.word}</span>
                {answered ? <span>multiple-choice-answered</span> : null}
                <button
                    type="button"
                    onClick={() => {
                        setAnswered(true);
                        onAnswer(true);
                    }}
                >
                    answer-correct
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setAnswered(true);
                        onAnswer(false);
                    }}
                >
                    answer-wrong
                </button>
            </div>
        );
    },
}));

vi.mock('./ShortAnswerQuiz', () => ({
    default: ({ onAnswer }) => {
        const [answered, setAnswered] = React.useState(false);
        return (
            <div>
                short-answer-quiz
                {answered ? <span>short-answer-answered</span> : null}
                <button
                    type="button"
                    onClick={() => {
                        setAnswered(true);
                        onAnswer(true);
                    }}
                >
                    answer-correct
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setAnswered(true);
                        onAnswer(false);
                    }}
                >
                    answer-wrong
                </button>
            </div>
        );
    },
}));

vi.mock('./CompleteWordQuiz', () => ({
    default: ({ onAnswer }) => {
        const [answered, setAnswered] = React.useState(false);
        return (
            <div>
                complete-word-quiz
                {answered ? <span>complete-word-answered</span> : null}
                <button
                    type="button"
                    onClick={() => {
                        setAnswered(true);
                        onAnswer(true);
                    }}
                >
                    answer-correct
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setAnswered(true);
                        onAnswer(false);
                    }}
                >
                    answer-wrong
                </button>
            </div>
        );
    },
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

vi.mock('./ToeflReadingTaskQuiz', () => ({
    default: ({ taskType, reviewAsset, onAssetCreated }) => (
        <div>
            toefl-reading-task:{taskType}
            {reviewAsset ? <span>review-asset:{reviewAsset.title}</span> : null}
            <button
                type="button"
                onClick={() => onAssetCreated?.({
                    mode: taskType === 'academic-passage' ? 'toefl-academic-passage' : 'toefl-daily-life',
                    taskType,
                    title: 'Generated Passage Set',
                    payload: {
                        taskType,
                        title: 'Generated Passage Set',
                        stimulus: 'Generated stimulus',
                        questions: [],
                    },
                    metadata: { targetScore: 100, questionCount: 5 },
                })}
            >
                mock-generate-toefl-asset
            </button>
        </div>
    ),
}));

vi.mock('./ToeflReadingMockTest', () => ({
    default: () => <div>toefl-reading-mock-test</div>,
}));

vi.mock('./ToeflWritingTaskQuiz', () => ({
    default: ({ taskType }) => <div>toefl-writing-task:{taskType}</div>,
}));

vi.mock('./ToeflWritingMockTest', () => ({
    default: () => <div>toefl-writing-mock-test</div>,
}));

vi.mock('../utils/soundEffects', () => ({
    playSound: vi.fn(),
}));

vi.mock('../services/toeflAssetApi', () => toeflAssetApi);

import QuizView from './QuizView';

afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
    vi.restoreAllMocks();
});

describe('QuizView', () => {
    beforeEach(() => {
        toeflAssetApi.createToeflAsset.mockResolvedValue(null);
        toeflAssetApi.createToeflAttempt.mockResolvedValue(null);
        toeflAssetApi.getToeflAsset.mockResolvedValue(null);
        toeflAssetApi.listToeflAssets.mockResolvedValue([]);
    });

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
        expect(screen.getByTestId('quiz-view-shell').className).toContain('px-0');
    });

    test('starts folder quizzes with the lowest learning-rate word in that folder', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.9);

        render(
            <QuizView
                words={[
                    {
                        id: 1,
                        word: 'mastered-outside',
                        meaning_ko: '외부 숙달',
                        folderId: 2,
                        folderIds: [2],
                        learningRate: 0,
                        createdAt: '2026-04-01T00:00:00Z',
                        stats: { wrong_count: 0, review_count: 0 },
                    },
                    {
                        id: 2,
                        word: 'nearly-mastered',
                        meaning_ko: '거의 숙달',
                        folderId: 1,
                        folderIds: [1],
                        learningRate: 92,
                        createdAt: '2026-04-01T00:00:00Z',
                        stats: { wrong_count: 0, review_count: 0 },
                    },
                    {
                        id: 3,
                        word: 'needs-practice',
                        meaning_ko: '연습 필요',
                        folderId: 1,
                        folderIds: [1],
                        learningRate: 18,
                        createdAt: '2026-04-01T00:00:00Z',
                        stats: { wrong_count: 0, review_count: 0 },
                    },
                ]}
                setView={vi.fn()}
                user={{ id: 1 }}
                aiMode={false}
                setAiMode={vi.fn()}
                aiConfig={{ provider: 'gemini', model: 'gemini-2.0-flash', apiKey: 'test-key' }}
                folders={[
                    { id: 1, name: 'TOEFL Core', color: 'blue' },
                    { id: 2, name: 'Outside', color: 'green' },
                ]}
                onUpdateLearningRate={vi.fn()}
            />
        );

        fireEvent.click(screen.getByText('객관식 퀴즈'));
        fireEvent.mouseUp(screen.getByRole('button', { name: /TOEFL Core/ }));
        fireEvent.click(screen.getByRole('button', { name: '퀴즈 시작하기' }));

        expect(screen.getByText('multiple-choice-quiz')).toBeTruthy();
        expect(screen.getByTestId('current-quiz-word').textContent).toBe('needs-practice');
    });

    test('starts mixed folder quizzes with the lowest learning-rate word in that folder', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0);

        render(
            <QuizView
                words={[
                    {
                        id: 1,
                        word: 'nearly-mastered',
                        meaning_ko: '거의 숙달',
                        folderId: 1,
                        folderIds: [1],
                        learningRate: 92,
                        createdAt: '2026-04-01T00:00:00Z',
                        stats: { wrong_count: 0, review_count: 0 },
                    },
                    {
                        id: 2,
                        word: 'half-ready',
                        meaning_ko: '절반 준비',
                        folderId: 1,
                        folderIds: [1],
                        learningRate: 54,
                        createdAt: '2026-04-01T00:00:00Z',
                        stats: { wrong_count: 0, review_count: 0 },
                    },
                    {
                        id: 3,
                        word: 'needs-practice',
                        meaning_ko: '연습 필요',
                        folderId: 1,
                        folderIds: [1],
                        learningRate: 18,
                        createdAt: '2026-04-01T00:00:00Z',
                        stats: { wrong_count: 0, review_count: 0 },
                    },
                ]}
                setView={vi.fn()}
                user={{ id: 1 }}
                aiMode={false}
                setAiMode={vi.fn()}
                aiConfig={{ provider: 'gemini', model: 'gemini-2.0-flash', apiKey: 'test-key' }}
                folders={[{ id: 1, name: 'TOEFL Core', color: 'blue' }]}
                onUpdateLearningRate={vi.fn()}
            />
        );

        fireEvent.click(screen.getByText('AI 복합 퀴즈'));
        fireEvent.mouseUp(screen.getByRole('button', { name: /TOEFL Core/ }));
        fireEvent.click(screen.getByRole('button', { name: '퀴즈 시작하기' }));

        expect(screen.getByText('multiple-choice-quiz')).toBeTruthy();
        expect(screen.getByTestId('current-quiz-word').textContent).toBe('needs-practice');
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
        expect(screen.getByText('short-answer-quiz')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'answer-correct' }));
        expect(screen.getByText('complete-word-quiz')).toBeTruthy();
    });

    test('resets a failed mixed quiz question before showing the retry', () => {
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
        expect(screen.queryByText('multiple-choice-answered')).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'answer-wrong' }));

        expect(screen.getByText('multiple-choice-quiz')).toBeTruthy();
        expect(screen.queryByText('multiple-choice-answered')).toBeNull();
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

        for (let i = 0; i < 20; i += 1) {
            fireEvent.click(screen.getByRole('button', { name: 'answer-correct' }));
        }

        expect(screen.getByRole('heading', { name: '학습 세트 1 완료' })).toBeTruthy();
        expect(screen.getByRole('button', { name: '다음 학습으로' })).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: '다음 학습으로' }));
        expect(screen.queryByRole('heading', { name: '학습 세트 1 완료' })).toBeNull();
        expect(screen.getByText(/-quiz$/)).toBeTruthy();
    });

    const renderQuizView = () => render(
        <QuizView
            words={[
                {
                    id: 1,
                    word: 'ecosystem',
                    meaning_ko: '생태계',
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

    test('offers all TOEFL Reading and Writing practice modes', () => {
        renderQuizView();
        expect(screen.getByText('Complete the Words')).toBeTruthy();
        expect(screen.getByText('Read in Daily Life')).toBeTruthy();
        expect(screen.getByText('Read an Academic Passage')).toBeTruthy();
        expect(screen.getByText('TOEFL Reading Mock Test')).toBeTruthy();
        expect(screen.getByText('Build a Sentence')).toBeTruthy();
        expect(screen.getByText('Write an Email')).toBeTruthy();
        expect(screen.getByText('Write for an Academic Discussion')).toBeTruthy();
        expect(screen.getByText('TOEFL Writing Mock Test')).toBeTruthy();
    });

    test.each([
        ['Build a Sentence', 'toefl-build-quiz'],
        ['Read in Daily Life', 'toefl-reading-task:daily-life'],
        ['Read an Academic Passage', 'toefl-reading-task:academic-passage'],
        ['TOEFL Reading Mock Test', 'toefl-reading-mock-test'],
        ['Write an Email', 'toefl-writing-task:email'],
        ['Write for an Academic Discussion', 'toefl-writing-task:academic-discussion'],
        ['TOEFL Writing Mock Test', 'toefl-writing-mock-test'],
    ])('opens %s from the TOEFL dashboard', (modeLabel, expectedText) => {
        renderQuizView();
        fireEvent.click(screen.getByText(modeLabel));
        fireEvent.click(screen.getByRole('button', { name: '퀴즈 시작하기' }));
        expect(screen.getByText(expectedText)).toBeTruthy();
    });

    test('opens Complete the Words from the TOEFL dashboard', () => {
        renderQuizView();
        fireEvent.click(screen.getByText('Complete the Words'));
        fireEvent.click(screen.getByRole('button', { name: '퀴즈 시작하기' }));
        expect(screen.getByText('toefl-complete-quiz')).toBeTruthy();
    });

    test('shows TOEFL Reading mastery summary from accumulated practice stats', () => {
        localStorage.setItem('vocaloop_toefl_reading_stats_v1', JSON.stringify({
            version: 1,
            totals: { correct: 3, total: 4 },
            byTask: {
                'daily-life': { correct: 1, total: 2 },
                'academic-passage': { correct: 2, total: 2 },
            },
            byTopic: {
                campus: { correct: 1, total: 2 },
            },
            bySkill: {
                inference: { correct: 0, total: 1 },
                detail: { correct: 3, total: 3 },
            },
            recent: [],
        }));

        render(
            <QuizView
                words={[
                    {
                        id: 1,
                        word: 'ecosystem',
                        meaning_ko: '생태계',
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

        expect(screen.getByText('TOEFL Reading Mastery')).toBeTruthy();
        expect(screen.getByText('75%')).toBeTruthy();
        expect(screen.getAllByText('Read in Daily Life').length).toBeGreaterThan(0);
        expect(screen.getByText('inference')).toBeTruthy();
    });

    test('opens an initial TOEFL review asset without configuration', async () => {
        const onInitialReviewAssetConsumed = vi.fn();

        render(
            <QuizView
                words={[
                    {
                        id: 1,
                        word: 'ecosystem',
                        meaning_ko: '생태계',
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
                initialReviewAsset={{
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
                }}
                onInitialReviewAssetConsumed={onInitialReviewAssetConsumed}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('toefl-reading-task:daily-life')).toBeTruthy();
            expect(screen.getByText('review-asset:Campus Notice Review')).toBeTruthy();
        });
        expect(screen.queryByRole('button', { name: '퀴즈 시작하기' })).toBeNull();
        expect(onInitialReviewAssetConsumed).toHaveBeenCalledTimes(1);
    });

    test('records generated TOEFL assets in Recent Activity and reopens them without an attempt', async () => {
        const savedAsset = {
            id: 91,
            mode: 'toefl-academic-passage',
            taskType: 'academic-passage',
            title: 'Generated Passage Set',
            payload: {
                taskType: 'academic-passage',
                title: 'Generated Passage Set',
                stimulus: 'Generated stimulus',
                questions: [],
            },
            metadata: { targetScore: 100, questionCount: 5 },
            createdAt: '2026-05-15T00:00:00Z',
        };
        toeflAssetApi.createToeflAsset.mockResolvedValue(savedAsset);
        toeflAssetApi.getToeflAsset.mockResolvedValue(savedAsset);

        renderQuizView();
        fireEvent.click(screen.getByText('Read an Academic Passage'));
        fireEvent.click(screen.getByRole('button', { name: '퀴즈 시작하기' }));

        fireEvent.click(await screen.findByRole('button', { name: 'mock-generate-toefl-asset' }));

        await waitFor(() => {
            const history = JSON.parse(localStorage.getItem('vocaloop_quiz_history') || '[]');
            expect(history[0]).toEqual(expect.objectContaining({
                type: 'toefl-asset',
                assetId: 91,
                mode: 'Read an Academic Passage',
                modeId: 'toefl-academic-passage',
                title: 'Generated Passage Set',
            }));
        });
        expect(toeflAssetApi.createToeflAttempt).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: '종료하기' }));
        expect(await screen.findByText('Generated Passage Set')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Generated Passage Set 다시 열기' }));

        await waitFor(() => {
            expect(toeflAssetApi.getToeflAsset).toHaveBeenCalledWith(91);
            expect(screen.getByText('review-asset:Generated Passage Set')).toBeTruthy();
        });
        expect(screen.queryByRole('button', { name: '퀴즈 시작하기' })).toBeNull();
    });

    describe('session persistence across refresh', () => {
        const wordFixture = [
            {
                id: 1,
                word: 'serendipity',
                meaning_ko: '뜻밖의 발견',
                learningRate: 0,
                createdAt: '2026-04-01T00:00:00Z',
                stats: { wrong_count: 0, review_count: 0 },
            },
        ];

        const renderView = (props = {}) => render(
            <QuizView
                words={wordFixture}
                setView={vi.fn()}
                user={{ id: 1 }}
                aiMode={false}
                setAiMode={vi.fn()}
                aiConfig={{ provider: 'gemini', model: 'gemini-2.0-flash', geminiApiKey: 'test-key' }}
                folders={[]}
                onUpdateLearningRate={vi.fn()}
                {...props}
            />
        );

        test('restores an in-progress word quiz and reapplies its AI mode after remount', () => {
            const { unmount } = renderView({ aiMode: true });
            fireEvent.click(screen.getByText('객관식 퀴즈'));
            fireEvent.click(screen.getByRole('button', { name: '퀴즈 시작하기' }));
            expect(screen.getByText('multiple-choice-quiz')).toBeTruthy();

            unmount();

            const setAiMode = vi.fn();
            renderView({ aiMode: false, setAiMode });

            // 모드 선택 없이 곧바로 진행 중이던 퀴즈가 복원된다.
            expect(screen.getByText('multiple-choice-quiz')).toBeTruthy();
            expect(screen.queryByRole('button', { name: '퀴즈 시작하기' })).toBeNull();
            // 새로고침 시 초기화된 AI 채점 모드도 되살린다.
            expect(setAiMode).toHaveBeenCalledWith(true);
        });

        test('does not persist or restore TOEFL quizzes', () => {
            const { unmount } = renderView();
            fireEvent.click(screen.getByText('Build a Sentence'));
            fireEvent.click(screen.getByRole('button', { name: '퀴즈 시작하기' }));
            expect(screen.getByText('toefl-build-quiz')).toBeTruthy();
            expect(localStorage.getItem('vocaloop_quiz_session')).toBeNull();

            unmount();
            renderView();

            // 모드 선택 대시보드로 돌아간다(TOEFL은 복원 대상 아님).
            expect(screen.queryByText('toefl-build-quiz')).toBeNull();
            expect(screen.getByText('객관식 퀴즈')).toBeTruthy();
        });

        test('clears the saved session when the quiz is exited', () => {
            const { unmount } = renderView();
            fireEvent.click(screen.getByText('객관식 퀴즈'));
            fireEvent.click(screen.getByRole('button', { name: '퀴즈 시작하기' }));
            expect(localStorage.getItem('vocaloop_quiz_session')).not.toBeNull();

            fireEvent.click(screen.getByRole('button', { name: '종료하기' }));
            expect(localStorage.getItem('vocaloop_quiz_session')).toBeNull();

            unmount();
            renderView();
            expect(screen.queryByText('multiple-choice-quiz')).toBeNull();
            expect(screen.getByText('객관식 퀴즈')).toBeTruthy();
        });
    });

    test('hydrates Recent Activity with previously saved TOEFL assets from the backend', async () => {
        const savedAsset = {
            id: 131,
            mode: 'toefl-academic-passage',
            taskType: 'academic-passage',
            title: 'Previously Generated Passage',
            payload: {
                taskType: 'academic-passage',
                title: 'Previously Generated Passage',
                stimulus: 'Persisted stimulus',
                questions: [],
            },
            metadata: { targetScore: 100, questionCount: 5 },
            createdAt: '2026-05-15T00:30:00Z',
        };
        toeflAssetApi.listToeflAssets.mockResolvedValue([savedAsset]);
        toeflAssetApi.getToeflAsset.mockResolvedValue(savedAsset);

        renderQuizView();

        expect(await screen.findByText('Previously Generated Passage')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Previously Generated Passage 다시 열기' }));

        await waitFor(() => {
            expect(toeflAssetApi.getToeflAsset).toHaveBeenCalledWith(131);
            expect(screen.getByText('review-asset:Previously Generated Passage')).toBeTruthy();
        });
        expect(screen.queryByRole('button', { name: '퀴즈 시작하기' })).toBeNull();
    });
});
