// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import ToeflWritingMockTest from './ToeflWritingMockTest';

const toeflService = vi.hoisted(() => ({
  estimateWritingBand: vi.fn(() => 'Intermediate'),
  evaluateWritingMockSection: vi.fn(),
  generateWritingMockSection: vi.fn(),
}));

const soundEffects = vi.hoisted(() => ({
  playSound: vi.fn(),
}));

vi.mock('../services/toeflService', () => toeflService);
vi.mock('../utils/soundEffects', () => soundEffects);

describe('ToeflWritingMockTest', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test('disables browser autocomplete on the mock Write an Email response box', async () => {
    render(
      <ToeflWritingMockTest
        aiConfig={{ provider: 'codex' }}
        targetScore={100}
        vocabSource={{ mode: 'off', pool: [] }}
        topicSelection={{ enabled: false }}
        onExit={vi.fn()}
        reviewAsset={{
          id: 2,
          payload: {
            section: {
              sentenceItems: [
                {
                  id: 1,
                  context: 'Context',
                  sentenceFrame: '_____ need help.',
                  target: 'I need help.',
                  words: ['I', 'need', 'help'],
                  answer: ['I'],
                },
              ],
              emailTask: {
                taskType: 'email',
                title: 'Write an Email',
                situation: 'Email a campus office about a schedule change.',
                requirements: ['Explain the issue.', 'Ask for the next step.'],
              },
              discussionTask: {
                taskType: 'academic-discussion',
                course: 'Campus Life',
                professorQuestion: 'What makes a useful campus service?',
                studentPosts: [],
              },
            },
          },
          metadata: {},
        }}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: 'I' }));
    fireEvent.click(screen.getByRole('button', { name: '다음 문항' }));

    const responseBox = await screen.findByPlaceholderText('Write your email here.');
    expect(responseBox.getAttribute('autocomplete')).toBe('off');
  });
});
