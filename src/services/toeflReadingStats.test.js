// @vitest-environment jsdom

import { afterEach, describe, expect, test } from 'vitest';
import {
  clearToeflReadingStats,
  readToeflReadingStats,
  recordToeflReadingAttempt,
  summarizeToeflReadingStats,
} from './toeflReadingStats';

afterEach(() => {
  localStorage.clear();
});

describe('toeflReadingStats', () => {
  test('accumulates Reading results by task, topic, and skill tag', () => {
    clearToeflReadingStats();

    recordToeflReadingAttempt({
      taskType: 'daily-life',
      topicTags: ['campus'],
      results: [
        { correct: true, skillTag: 'scanning' },
        { correct: false, skillTag: 'inference' },
      ],
    });
    recordToeflReadingAttempt({
      taskType: 'daily-life',
      topicTags: ['campus', 'schedule'],
      results: [
        { correct: true, skillTag: 'inference' },
      ],
    });

    expect(readToeflReadingStats()).toMatchObject({
      totals: { correct: 2, total: 3 },
      byTask: {
        'daily-life': { correct: 2, total: 3 },
      },
      byTopic: {
        campus: { correct: 2, total: 3 },
        schedule: { correct: 1, total: 1 },
      },
      bySkill: {
        scanning: { correct: 1, total: 1 },
        inference: { correct: 1, total: 2 },
      },
    });
  });

  test('summarizes recent accuracy and weakest buckets for dashboard display', () => {
    clearToeflReadingStats();

    recordToeflReadingAttempt({
      taskType: 'daily-life',
      topicTags: ['campus'],
      results: [
        { correct: false, skillTag: 'inference' },
        { correct: true, skillTag: 'scanning' },
      ],
    });
    recordToeflReadingAttempt({
      taskType: 'academic-passage',
      topicTags: ['biology'],
      results: [
        { correct: true, skillTag: 'main-idea' },
        { correct: true, skillTag: 'detail' },
      ],
    });

    expect(summarizeToeflReadingStats()).toMatchObject({
      accuracy: 75,
      weakestTask: { id: 'daily-life', accuracy: 50 },
      weakestTopic: { id: 'campus', accuracy: 50 },
      weakestSkill: { id: 'inference', accuracy: 0 },
      nextTaskId: 'daily-life',
    });
  });
});
