// @vitest-environment jsdom

import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import ToeflWritingTaskQuiz from './ToeflWritingTaskQuiz';

const toeflService = vi.hoisted(() => ({
  evaluateWritingResponse: vi.fn(),
  generateWritingTask: vi.fn(),
}));

const soundEffects = vi.hoisted(() => ({
  playSound: vi.fn(),
}));

vi.mock('../services/toeflService', () => toeflService);
vi.mock('../utils/soundEffects', () => soundEffects);

describe('ToeflWritingTaskQuiz', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  test('disables browser autocomplete on the Write an Email response box', async () => {
    render(
      <ToeflWritingTaskQuiz
        aiConfig={{ provider: 'codex' }}
        taskType="email"
        targetScore={100}
        vocabSource={{ mode: 'off', pool: [] }}
        topicSelection={{ enabled: false }}
        onExit={vi.fn()}
        reviewAsset={{
          id: 1,
          taskType: 'email',
          payload: {
            task: {
              taskType: 'email',
              title: 'Write an Email',
              situation: 'Ask a library staff member about reserving a study room.',
              requirements: ['Explain when you need the room.', 'Ask about available equipment.'],
            },
          },
          metadata: {},
        }}
      />
    );

    const responseBox = await screen.findByPlaceholderText('Write your email here.');

    await waitFor(() => {
      expect(responseBox.getAttribute('autocomplete')).toBe('off');
    });
  });
});
