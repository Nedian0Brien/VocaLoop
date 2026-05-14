// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import ToeflBuildSentenceQuiz from './ToeflBuildSentenceQuiz';

const toeflService = vi.hoisted(() => ({
  generateBuildSentenceSet: vi.fn(),
  generateBuildSentenceFeedback: vi.fn(),
  generateBuildSentenceSummary: vi.fn(),
}));

const soundEffects = vi.hoisted(() => ({
  playSound: vi.fn(),
}));

vi.mock('../services/toeflService', () => toeflService);
vi.mock('../utils/soundEffects', () => soundEffects);

describe('ToeflBuildSentenceQuiz ETS-style schema', () => {
  beforeEach(() => {
    toeflService.generateBuildSentenceSet.mockResolvedValue({
      questions: [
        {
          id: 1,
          context: "I'm planning a trip to Europe this summer.",
          sentenceFrame: '_____ _____ book your _____ _____ ?',
          target: 'Did you book your flight yet?',
          words: ['flight', 'Did', 'yet', 'you', 'already'],
          answer: ['Did', 'you', 'flight', 'yet'],
        },
      ],
    });
    toeflService.generateBuildSentenceFeedback.mockResolvedValue({
      isCorrect: true,
      feedback: '정확한 어순입니다.',
    });
    toeflService.generateBuildSentenceSummary.mockResolvedValue({
      summary: '좋습니다.',
      strengths: [],
      improvements: [],
      nextSteps: [],
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test('renders context and frame, then grades the completed frame instead of loose token text', async () => {
    render(
      <ToeflBuildSentenceQuiz
        aiConfig={{ provider: 'gemini', apiKey: 'test-key' }}
        questionCount={10}
        targetScore={100}
        vocabSource={{ mode: 'off', pool: [] }}
        topicSelection={{ enabled: false }}
        onExit={vi.fn()}
      />
    );

    await screen.findByText("I'm planning a trip to Europe this summer.");
    expect(screen.getByText('_____ _____ book your _____ _____ ?')).toBeTruthy();

    const checkButton = screen.getByRole('button', { name: '정답 확인' });
    expect(checkButton.disabled).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: /Did/ }));
    fireEvent.click(screen.getByRole('button', { name: /you/ }));
    fireEvent.click(screen.getByRole('button', { name: /flight/ }));

    expect(checkButton.disabled).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: /yet/ }));
    expect(checkButton.disabled).toBe(false);

    fireEvent.click(checkButton);

    await waitFor(() => {
      expect(toeflService.generateBuildSentenceFeedback).toHaveBeenCalledWith({
        aiConfig: { provider: 'gemini', apiKey: 'test-key' },
        target: 'Did you book your flight yet?',
        userAttempt: 'Did you book your flight yet?',
      });
    });
  });
});
