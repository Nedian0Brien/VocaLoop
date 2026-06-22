// @vitest-environment jsdom

import React, { useState } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';

import { useBuildSentenceDrag } from './useBuildSentenceDrag';

function DragHarness({ status = 'ready' }) {
  const [arrangement, setArrangement] = useState([]);
  const [bank, setBank] = useState([0, 1, 2]);
  const { arrContainerRef, handlePointerDown } = useBuildSentenceDrag({
    currentQuestion: { words: ['Did', 'you', 'go'] },
    setArrangement,
    setBank,
    status,
  });

  return (
    <>
      <div
        data-testid="arrangement"
        ref={(node) => {
          arrContainerRef.current = node;
          if (node) {
            node.getBoundingClientRect = () => ({
              left: 0,
              right: 240,
              top: 0,
              bottom: 80,
              width: 240,
              height: 80,
            });
          }
        }}
      >
        {arrangement.map((wordIndex) => (
          <span key={wordIndex} data-arr-word="">
            {wordIndex}
          </span>
        ))}
      </div>
      <button
        type="button"
        ref={(node) => {
          if (node) {
            node.getBoundingClientRect = () => ({
              left: 8,
              right: 56,
              top: 8,
              bottom: 40,
              width: 48,
              height: 32,
            });
          }
        }}
        onPointerDown={handlePointerDown('bank', 0, 0)}
      >
        Did
      </button>
      <output data-testid="bank">{JSON.stringify(bank)}</output>
      <output data-testid="arranged">{JSON.stringify(arrangement)}</output>
    </>
  );
}

describe('useBuildSentenceDrag', () => {
  afterEach(() => {
    cleanup();
  });

  test('moves a bank word into the arrangement after a real drag', () => {
    render(<DragHarness />);

    act(() => {
      fireEvent.pointerDown(screen.getByRole('button', { name: 'Did' }), {
        button: 0,
        clientX: 12,
        clientY: 12,
      });
    });
    act(() => {
      fireEvent.pointerMove(window, { clientX: 40, clientY: 32 });
    });
    act(() => {
      fireEvent.pointerUp(window);
    });

    expect(screen.getByTestId('bank').textContent).toBe('[1,2]');
    expect(screen.getByTestId('arranged').textContent).toBe('[0]');
  });

  test('ignores pointer input after the question is no longer ready', () => {
    render(<DragHarness status="checked" />);

    act(() => {
      fireEvent.pointerDown(screen.getByRole('button', { name: 'Did' }), {
        button: 0,
        clientX: 12,
        clientY: 12,
      });
      fireEvent.pointerMove(window, { clientX: 40, clientY: 32 });
      fireEvent.pointerUp(window);
    });

    expect(screen.getByTestId('bank').textContent).toBe('[0,1,2]');
    expect(screen.getByTestId('arranged').textContent).toBe('[]');
  });
});
