import { useRef } from 'react';
import { getEditableIndices } from '../services/toefl/completeWordEngine';

export function useCompleteWordInputs({
  checked,
  currentAnswers,
  currentIndex,
  currentQuestion,
  setAnswers,
}) {
  const inputRefs = useRef({});

  const focusInputByKey = (key) => {
    const input = inputRefs.current[key];
    if (!input) return;
    input.focus();
    input.select();
  };

  const focusBlankInput = (blankIndex, preferFirstEmpty = true) => {
    const blank = currentQuestion?.blanks?.[blankIndex];
    if (!blank) return;
    const editableIndices = getEditableIndices(blank);
    if (editableIndices.length === 0) return;
    const blankAnswers = currentAnswers[blankIndex] || [];
    const targetIndex = preferFirstEmpty
      ? editableIndices.find((index) => !(blankAnswers[index] || '').trim()) ?? editableIndices[0]
      : editableIndices[0];
    focusInputByKey(`${currentIndex}-${blankIndex}-${targetIndex}`);
  };

  const focusNextIncompleteBlank = (fromBlankIndex) => {
    if (!currentQuestion) return;
    const nextBlankIndex = currentQuestion.blanks.findIndex((blank, blankIndex) => {
      if (blankIndex <= fromBlankIndex) return false;
      const editableIndices = getEditableIndices(blank);
      if (editableIndices.length === 0) return false;
      const blankAnswers = currentAnswers[blankIndex] || [];
      return editableIndices.some((index) => !(blankAnswers[index] || '').trim());
    });
    if (nextBlankIndex === -1) return;
    requestAnimationFrame(() => focusBlankInput(nextBlankIndex));
  };

  const focusNextInput = (blankIndex, inputIndex) => {
    const blank = currentQuestion?.blanks?.[blankIndex];
    if (!blank) return;
    const editableIndices = getEditableIndices(blank);
    const nextEditableIndex = editableIndices.find((index) => index > inputIndex);
    if (nextEditableIndex === undefined) return;
    focusInputByKey(`${currentIndex}-${blankIndex}-${nextEditableIndex}`);
  };

  const focusPreviousInput = (blankIndex, inputIndex) => {
    const blank = currentQuestion?.blanks?.[blankIndex];
    if (!blank) return;
    const editableIndices = getEditableIndices(blank);
    const prevInSameBlank = [...editableIndices].reverse().find((index) => index < inputIndex);
    if (prevInSameBlank !== undefined) {
      focusInputByKey(`${currentIndex}-${blankIndex}-${prevInSameBlank}`);
      return;
    }
    for (let i = blankIndex - 1; i >= 0; i -= 1) {
      const prevBlank = currentQuestion.blanks[i];
      const prevEditableIndices = getEditableIndices(prevBlank);
      if (prevEditableIndices.length === 0) continue;
      const targetIndex = prevEditableIndices[prevEditableIndices.length - 1];
      focusInputByKey(`${currentIndex}-${i}-${targetIndex}`);
      return;
    }
  };

  const handleAnswerChange = (blankIndex, inputIndex, value) => {
    if (!currentQuestion) return;
    const sanitized = value.replace(/[^a-zA-Z]/g, '').toLowerCase().slice(-1);

    const blank = currentQuestion.blanks[blankIndex];
    const editableIndices = getEditableIndices(blank);
    const updatedBlankAnswers = [...(currentAnswers[blankIndex] || [])];
    updatedBlankAnswers[inputIndex] = sanitized;
    const isBlankFilled =
      editableIndices.length > 0 &&
      editableIndices.every((index) => (updatedBlankAnswers[index] || '').trim().length > 0);

    setAnswers((prev) => {
      const updated = [...prev];
      const questionAnswers = [...(updated[currentIndex] || [])];
      const blankAnswers = [...(questionAnswers[blankIndex] || [])];
      blankAnswers[inputIndex] = sanitized;
      questionAnswers[blankIndex] = blankAnswers;
      updated[currentIndex] = questionAnswers;
      return updated;
    });

    if (sanitized) {
      const hasNextInputInBlank = editableIndices.some((index) => index > inputIndex);
      if (hasNextInputInBlank) focusNextInput(blankIndex, inputIndex);
      else if (isBlankFilled) focusNextIncompleteBlank(blankIndex);
    }
  };

  const handleInputKeyDown = (event, blankIndex, inputIndex) => {
    if (event.key !== 'Backspace' || checked) return;
    const currentValue = (currentAnswers[blankIndex] || [])[inputIndex] || '';
    if (currentValue) return;
    event.preventDefault();
    focusPreviousInput(blankIndex, inputIndex);
  };

  return {
    focusBlankInput,
    handleAnswerChange,
    handleInputKeyDown,
    inputRefs,
  };
}
