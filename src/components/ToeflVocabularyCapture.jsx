import React, { useMemo, useState } from 'react';
import { Check, HelpCircle, Save, X } from './Icons';
import { Button } from '../design-system';
import {
  getVocabularyWordKey,
  normalizeCapturedWord,
  tokenizeVocabularyText,
} from '../utils/vocabularyCapture';

export function VocabularyCaptureText({
  text,
  className,
  activeWordKey,
  underlinedWordKeys,
  onSelectWord,
}) {
  const tokens = useMemo(() => tokenizeVocabularyText(text), [text]);

  return (
    <p className={className}>
      {tokens.map((token, index) => {
        if (token.type !== 'word') return <React.Fragment key={`text-${index}`}>{token.value}</React.Fragment>;

        const isActive = token.key === activeWordKey;
        const isUnderlined = underlinedWordKeys?.has(token.key);
        return (
          <button
            key={`${token.key}-${index}`}
            type="button"
            aria-label={`${token.key} 단어 액션 열기`}
            onClick={() => onSelectWord?.(token.key)}
            className={[
              'inline rounded-sm px-0.5 -mx-0.5 align-baseline font-semibold text-inherit',
              'transition-colors duration-150',
              'hover:bg-brand-100 focus-visible:bg-brand-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400',
              isActive ? 'bg-brand-100 ring-1 ring-brand-200' : '',
              isUnderlined ? 'underline decoration-brand-500 decoration-2 underline-offset-4' : '',
            ].join(' ')}
          >
            {token.value}
          </button>
        );
      })}
    </p>
  );
}

export function useToeflVocabularyCapture({
  existingWords = [],
  onSaveVocabularyWord,
  onExplainVocabularyWord,
}) {
  const [activeWord, setActiveWord] = useState('');
  const [underlinedKeys, setUnderlinedKeys] = useState(new Set());
  const [savingKeys, setSavingKeys] = useState(new Set());
  const [savedKeys, setSavedKeys] = useState(new Set());
  const [explainingKeys, setExplainingKeys] = useState(new Set());
  const [explanations, setExplanations] = useState({});
  const [errors, setErrors] = useState({});

  const existingWordKeys = useMemo(() => {
    const keys = new Set();
    existingWords.forEach((word) => {
      const key = getVocabularyWordKey(word?.word || word);
      if (key) keys.add(key);
    });
    return keys;
  }, [existingWords]);

  const selectWord = (value) => {
    const word = normalizeCapturedWord(value);
    if (word) setActiveWord(word);
  };

  const clearActiveWord = () => setActiveWord('');

  const toggleUnderline = (value) => {
    const key = getVocabularyWordKey(value);
    if (!key) return;
    setUnderlinedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const clearError = (key) => {
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
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
    clearError(key);

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

  const explainWord = async (value, metadata = {}) => {
    const key = getVocabularyWordKey(value);
    if (!key) return;
    if (explanations[key]) return;
    if (!onExplainVocabularyWord) {
      setErrors((current) => ({ ...current, [key]: '뜻 설명 기능을 사용할 수 없습니다.' }));
      return;
    }

    setExplainingKeys((current) => new Set([...current, key]));
    clearError(key);

    try {
      const explanation = await onExplainVocabularyWord(key, metadata);
      setExplanations((current) => ({ ...current, [key]: explanation || { word: key } }));
    } catch (error) {
      setErrors((current) => ({
        ...current,
        [key]: error?.message || '뜻 설명을 불러오지 못했습니다.',
      }));
    } finally {
      setExplainingKeys((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
  };

  return {
    activeWord,
    selectWord,
    clearActiveWord,
    toggleUnderline,
    underlinedKeys,
    saveWord,
    explainWord,
    savingKeys,
    savedKeys,
    explainingKeys,
    explanations,
    existingWordKeys,
    errors,
  };
}

export function ToeflVocabularyActionBar({
  word,
  savingKeys,
  savedKeys,
  explainingKeys,
  underlinedWordKeys,
  existingWordKeys,
  explanations,
  errors,
  canExplain,
  onSaveWord,
  onExplainWord,
  onToggleUnderline,
  onClose,
  buildMetadata,
}) {
  const key = getVocabularyWordKey(word);
  if (!key) return null;

  const isSaving = savingKeys.has(key);
  const isSaved = savedKeys.has(key) || existingWordKeys.has(key);
  const isExplaining = explainingKeys.has(key);
  const isUnderlined = underlinedWordKeys.has(key);
  const explanation = explanations[key];
  const error = errors[key];

  return (
    <div className="rounded-md border border-brand-100 bg-white p-3 shadow-[var(--shadow-soft)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-base font-black text-surface-900">{key}</p>
          <p className="text-xs font-semibold text-surface-500">
            풀이 중에는 뜻을 숨기고 필요한 액션만 사용할 수 있습니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={isSaved ? 'secondary' : 'primary'}
            size="md"
            disabled={isSaving || isSaved}
            loading={isSaving}
            onClick={() => onSaveWord(key, buildMetadata?.(key) || {})}
            leftIcon={isSaved ? Check : Save}
            className="min-h-11"
          >
            {isSaving ? '저장 중' : isSaved ? '저장됨' : '단어장에 저장'}
          </Button>
          <Button
            variant={isUnderlined ? 'dark' : 'secondary'}
            size="md"
            onClick={() => onToggleUnderline(key)}
            className="min-h-11"
          >
            {isUnderlined ? '밑줄 해제' : '밑줄'}
          </Button>
          {canExplain && (
            <Button
              variant="secondary"
              size="md"
              loading={isExplaining}
              disabled={isExplaining}
              onClick={() => onExplainWord(key, buildMetadata?.(key) || {})}
              leftIcon={HelpCircle}
              className="min-h-11"
            >
              {isExplaining ? '불러오는 중' : '뜻 설명'}
            </Button>
          )}
          <button
            type="button"
            aria-label={`${key} 액션 닫기`}
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-surface-400 hover:bg-surface-50 hover:text-surface-700"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      {error && <p className="mt-3 text-sm font-bold text-danger-500">{error}</p>}
      {explanation && canExplain && (
        <div className="mt-3 rounded-md border border-surface-100 bg-surface-50 p-3">
          {explanation.meaning_ko && (
            <p className="text-sm font-black text-surface-900">{explanation.meaning_ko}</p>
          )}
          {Array.isArray(explanation.definitions) && explanation.definitions.length > 0 && (
            <p className="mt-1 text-sm font-semibold leading-relaxed text-surface-600">
              {explanation.definitions[0]}
            </p>
          )}
          {Array.isArray(explanation.examples) && explanation.examples[0]?.en && (
            <p className="mt-2 text-xs font-semibold leading-relaxed text-surface-500">
              {explanation.examples[0].en}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
