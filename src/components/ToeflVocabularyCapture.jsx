import React, { useId, useMemo, useState } from 'react';
import { Check, HelpCircle, Save } from './Icons';
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
  savingKeys = new Set(),
  savedKeys = new Set(),
  explainingKeys = new Set(),
  existingWordKeys = new Set(),
  explanations = {},
  errors = {},
  canExplain = false,
  onSelectWord,
  onSaveWord,
  onExplainWord,
  onToggleUnderline,
  buildMetadata,
}) {
  const captureId = useId();
  const tokens = useMemo(() => tokenizeVocabularyText(text), [text]);

  return (
    <p className={className}>
      {tokens.map((token, index) => {
        if (token.type !== 'word') return <React.Fragment key={`text-${index}`}>{token.value}</React.Fragment>;

        const tokenInstanceKey = `${captureId}-${token.key}-${token.start ?? index}`;
        const isActive = tokenInstanceKey === activeWordKey;
        const isUnderlined = underlinedWordKeys?.has(token.key);
        return (
          <span key={tokenInstanceKey} className="relative inline-block align-baseline">
            <button
              type="button"
              aria-label={`${token.key} 단어 액션 열기`}
              onClick={() => onSelectWord?.(token.key, tokenInstanceKey)}
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
            {isActive && (
              <VocabularyWordBubble
                word={token.key}
                savingKeys={savingKeys}
                savedKeys={savedKeys}
                explainingKeys={explainingKeys}
                underlinedWordKeys={underlinedWordKeys}
                existingWordKeys={existingWordKeys}
                explanations={explanations}
                errors={errors}
                canExplain={canExplain}
                onSaveWord={onSaveWord}
                onExplainWord={onExplainWord}
                onToggleUnderline={onToggleUnderline}
                buildMetadata={buildMetadata}
              />
            )}
          </span>
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

  const selectWord = (value, instanceKey) => {
    const word = normalizeCapturedWord(value);
    if (word) {
      const nextActiveWord = instanceKey || word;
      setActiveWord((current) => (current === nextActiveWord ? '' : nextActiveWord));
    }
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

function VocabularyWordBubble({
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
  const actionItems = [
    {
      label: isSaving ? '저장 중' : isSaved ? '저장됨' : '단어장에 저장',
      icon: isSaved ? Check : Save,
      disabled: isSaving || isSaved,
      isPrimary: !isSaved,
      onClick: () => onSaveWord(key, buildMetadata?.(key) || {}),
    },
    {
      label: isUnderlined ? '밑줄 해제' : '밑줄',
      icon: UnderlineGlyph,
      isActive: isUnderlined,
      onClick: () => onToggleUnderline(key),
    },
  ];

  if (canExplain) {
    actionItems.push({
      label: isExplaining ? '불러오는 중' : '뜻 설명',
      icon: HelpCircle,
      disabled: isExplaining,
      onClick: () => onExplainWord(key, buildMetadata?.(key) || {}),
    });
  }

  const actionPositions = actionItems.length === 2
    ? [
        { name: 'upper', left: 20, top: -34 },
        { name: 'lower', left: 50, top: 18 },
      ]
    : [
        { name: 'upper', left: 18, top: -48 },
        { name: 'middle', left: 62, top: -2 },
        { name: 'lower', left: 18, top: 44 },
      ];

  return (
    <span
      role="menu"
      aria-label={`${key} 단어 액션`}
      onClick={(event) => event.stopPropagation()}
      className={[
        'radial-word-actions right-half-word-actions pointer-events-none absolute left-full top-1/2 z-30 ml-1 -translate-y-1/2',
        actionItems.length === 2 ? 'h-24 w-36' : 'h-32 w-40',
      ].join(' ')}
    >
      {actionItems.map((item, index) => (
        <RadialActionButton
          key={item.label}
          label={item.label}
          Icon={item.icon}
          disabled={item.disabled}
          isActive={item.isActive}
          isPrimary={item.isPrimary}
          arcPosition={actionPositions[index]}
          onClick={item.onClick}
        />
      ))}
      {error && <span className="mt-2 block text-sm font-bold text-danger-500">{error}</span>}
      {explanation && canExplain && (
        <span className="pointer-events-auto absolute left-1/2 top-full mt-2 block w-56 -translate-x-1/2 rounded-md border border-surface-100 bg-white p-3 text-left shadow-[var(--shadow-soft)]">
          {explanation.meaning_ko && (
            <span className="block text-sm font-black text-surface-900">{explanation.meaning_ko}</span>
          )}
          {Array.isArray(explanation.definitions) && explanation.definitions.length > 0 && (
            <span className="mt-1 block text-sm font-semibold leading-relaxed text-surface-600">
              {explanation.definitions[0]}
            </span>
          )}
          {Array.isArray(explanation.examples) && explanation.examples[0]?.en && (
            <span className="mt-2 block text-xs font-semibold leading-relaxed text-surface-500">
              {explanation.examples[0].en}
            </span>
          )}
        </span>
      )}
    </span>
  );
}

function RadialActionButton({
  label,
  Icon,
  disabled = false,
  isActive = false,
  isPrimary = false,
  arcPosition,
  onClick,
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      data-arc-position={arcPosition?.name}
      disabled={disabled}
      onClick={onClick}
      style={{
        left: `${arcPosition?.left || 0}px`,
        top: `${arcPosition?.top || 0}px`,
      }}
      className={[
        'right-arc-action group pointer-events-auto absolute inline-flex h-10 w-10 origin-left items-center justify-center overflow-hidden rounded-full border px-0',
        'text-sm font-black shadow-[var(--shadow-soft)] transition-all duration-150',
        'hover:w-36 hover:justify-start hover:gap-2 hover:px-3',
        'focus-visible:w-36 focus-visible:justify-start focus-visible:gap-2 focus-visible:px-3',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
        'disabled:cursor-not-allowed disabled:opacity-70',
        isPrimary
          ? 'border-brand-600 bg-brand-600 text-white hover:bg-brand-700'
          : isActive
            ? 'border-surface-900 bg-surface-900 text-white'
            : 'border-brand-100 bg-white text-surface-700 hover:border-brand-300 hover:bg-brand-50',
      ].join(' ')}
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span className="max-w-0 overflow-hidden whitespace-nowrap text-xs opacity-0 transition-all duration-150 group-hover:max-w-[5.5rem] group-hover:opacity-100 group-focus-visible:max-w-[5.5rem] group-focus-visible:opacity-100">
        {label}
      </span>
    </button>
  );
}

function UnderlineGlyph(props) {
  return (
    <span {...props} aria-hidden="true" className={`${props.className || ''} flex items-center justify-center underline decoration-2 underline-offset-4`}>
      U
    </span>
  );
}
