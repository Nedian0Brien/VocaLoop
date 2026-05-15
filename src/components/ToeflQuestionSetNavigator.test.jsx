// @vitest-environment jsdom

import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';

import ToeflQuestionSetNavigator from './ToeflQuestionSetNavigator';

describe('ToeflQuestionSetNavigator', () => {
  afterEach(() => {
    cleanup();
  });

  test('keeps enough inner scroll padding so the active selector ring is not clipped', () => {
    render(
      <ToeflQuestionSetNavigator
        answeredStates={[true, true, true, true, true]}
        currentIndex={4}
        totalQuestions={5}
      />
    );

    const chart = screen.getByLabelText('문항 풀이 바 차트');
    expect(chart.className).toContain('px-1');
    expect(chart.className).toContain('py-1');
  });
});
