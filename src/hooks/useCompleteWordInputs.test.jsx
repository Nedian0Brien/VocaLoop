// @vitest-environment jsdom

import React, { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { getBlankSegments, getEditableIndices } from '../services/toefl/completeWordEngine';
import { useCompleteWordInputs } from './useCompleteWordInputs';

const question = {
  blanks: [
    { id: 1, answer: 'cat', segments: getBlankSegments('cat') },
    { id: 2, answer: 'dogs', segments: getBlankSegments('dogs') },
  ],
};

function CompleteWordHarness({ checked = false }) {
  const [answers, setAnswers] = useState([[
    ['', '', ''],
    ['', '', '', ''],
  ]]);
  const currentAnswers = answers[0] || [];
  const { handleAnswerChange, handleInputKeyDown, inputRefs } = useCompleteWordInputs({
    checked,
    currentAnswers,
    currentIndex: 0,
    currentQuestion: question,
    setAnswers,
  });

  return (
    <>
      {question.blanks.map((blank, blankIndex) => (
        <div key={blank.id}>
          {getEditableIndices(blank).map((inputIndex) => (
            <input
              key={`${blankIndex}-${inputIndex}`}
              aria-label={`blank-${blankIndex}-${inputIndex}`}
              value={(currentAnswers[blankIndex] || [])[inputIndex] || ''}
              ref={(node) => {
                if (node) inputRefs.current[`0-${blankIndex}-${inputIndex}`] = node;
              }}
              onChange={(event) => handleAnswerChange(blankIndex, inputIndex, event.target.value)}
              onKeyDown={(event) => handleInputKeyDown(event, blankIndex, inputIndex)}
            />
          ))}
        </div>
      ))}
      <output data-testid="answers">{JSON.stringify(answers)}</output>
    </>
  );
}

describe('useCompleteWordInputs', () => {
  afterEach(() => {
    cleanup();
  });

  test('sanitizes typed letters and advances within the same blank', () => {
    render(<CompleteWordHarness />);

    fireEvent.change(screen.getByLabelText('blank-0-1'), { target: { value: 'Z9' } });

    expect(screen.getByTestId('answers').textContent).toBe('[[["","z",""],["","","",""]]]');
    expect(document.activeElement).toBe(screen.getByLabelText('blank-0-2'));
  });

  test('moves focus back on empty backspace until answers are checked', () => {
    render(<CompleteWordHarness />);

    screen.getByLabelText('blank-0-2').focus();
    const backspaceEvent = new KeyboardEvent('keydown', {
      key: 'Backspace',
      bubbles: true,
      cancelable: true,
    });
    const preventDefault = vi.spyOn(backspaceEvent, 'preventDefault');
    screen.getByLabelText('blank-0-2').dispatchEvent(backspaceEvent);

    expect(preventDefault).toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getByLabelText('blank-0-1'));
  });
});
