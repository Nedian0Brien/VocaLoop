import React, { useMemo, useState } from 'react';
import { Check, Save, X } from './Icons';
import { Button } from '../design-system';
import { getVocabularyWordKey, normalizeCapturedWord } from '../utils/vocabularyCapture';

export function VocabularyCaptureText({ text, className, onCaptureWord }) {
  const rootRef = React.useRef(null);

  const handleCapture = () => {
    if (!onCaptureWord || typeof window === 'undefined') return;
    const selection = window.getSelection?.();
    const selectedText = selection?.toString?.() || '';
    const word = normalizeCapturedWord(selectedText);
    if (!word) return;

    const anchorNode = selection?.anchorNode;
    if (anchorNode && rootRef.current && !rootRef.current.contains(anchorNode)) return;

    onCaptureWord(word);
    selection?.removeAllRanges?.();
  };

  return (
    <p
      ref={rootRef}
      className={className}
      onMouseUp={handleCapture}
      onTouchEnd={handleCapture}
    >
      {text}
    </p>
  );
}

export function useToeflVocabularyCapture({ existingWords = [], onSaveVocabularyWord }) {
  const [capturedWords, setCapturedWords] = useState([]);
  const [savingKeys, setSavingKeys] = useState(new Set());
  const [savedKeys, setSavedKeys] = useState(new Set());
  const [errors, setErrors] = useState({});

  const existingWordKeys = useMemo(() => {
    const keys = new Set();
    existingWords.forEach((word) => {
      const key = getVocabularyWordKey(word?.word || word);
      if (key) keys.add(key);
    });
    return keys;
  }, [existingWords]);

  const captureWord = (value) => {
    const word = normalizeCapturedWord(value);
    if (!word) return;
    setCapturedWords((current) => {
      const withoutDuplicate = current.filter((item) => getVocabularyWordKey(item) !== word);
      return [word, ...withoutDuplicate].slice(0, 6);
    });
  };

  const dismissWord = (value) => {
    const key = getVocabularyWordKey(value);
    setCapturedWords((current) => current.filter((item) => getVocabularyWordKey(item) !== key));
  };

  const saveWord = async (value, metadata = {}) => {
    const key = getVocabularyWordKey(value);
    if (!key) return;
    if (savedKeys.has(key) || existingWordKeys.has(key)) {
      setSavedKeys((current) => new Set([...current, key]));
      return;
    }
    if (!onSaveVocabularyWord) {
      setErrors((current) => ({ ...current, [key]: '단어장 저장 기능을 사용할 수 없습니다.' }));
      return;
    }

    setSavingKeys((current) => new Set([...current, key]));
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });

    try {
      await onSaveVocabularyWord(key, metadata);
      setSavedKeys((current) => new Set([...current, key]));
    } catch (error) {
      setErrors((current) => ({
        ...current,
        [key]: error?.message || '단어 저장에 실패했습니다.',
      }));
    } finally {
      setSavingKeys((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
  };

  return {
    capturedWords,
    captureWord,
    dismissWord,
    saveWord,
    savingKeys,
    savedKeys,
    existingWordKeys,
    errors,
  };
}

export function ToeflVocabularyCaptureTray({
  words,
  savingKeys,
  savedKeys,
  existingWordKeys,
  errors,
  onSaveWord,
  onDismissWord,
  buildMetadata,
}) {
  if (!Array.isArray(words) || words.length === 0) return null;

  return (
    <div className="rounded-md border border-brand-100 bg-brand-50/70 p-4 space-y-3">
      <div>
        <p className="text-sm font-black text-brand-900">선택한 단어</p>
        <p className="text-xs font-semibold text-brand-700 mt-0.5">
          풀이 중에는 뜻을 보여주지 않고 단어장에만 저장합니다.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {words.map((word) => {
          const key = getVocabularyWordKey(word);
          const isSaving = savingKeys.has(key);
          const isSaved = savedKeys.has(key) || existingWordKeys.has(key);
          const error = errors[key];

          return (
            <div
              key={key}
              className={[
                'inline-flex max-w-full items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm shadow-sm',
                isSaved ? 'border-success-200' : error ? 'border-danger-200' : 'border-brand-100',
              ].join(' ')}
            >
              <span className="min-w-0 truncate font-black text-surface-800">{word}</span>
              {error && <span className="text-xs font-bold text-danger-500">{error}</span>}
              <Button
                variant={isSaved ? 'secondary' : 'primary'}
                size="sm"
                disabled={isSaving || isSaved}
                loading={isSaving}
                onClick={() => onSaveWord(word, buildMetadata?.(word) || {})}
                leftIcon={isSaved ? Check : Save}
              >
                {isSaving ? '저장 중' : isSaved ? '저장됨' : '단어장에 저장'}
              </Button>
              <button
                type="button"
                aria-label={`${word} 닫기`}
                onClick={() => onDismissWord(word)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-surface-400 hover:bg-surface-50 hover:text-surface-700"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
