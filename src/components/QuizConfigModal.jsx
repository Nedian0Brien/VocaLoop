import React, { useState, useEffect, useMemo } from 'react';
import { X, Settings, Layers, Hash, Sparkles, Play, Volume2, Target, BookOpen, Plus, Edit3, CheckCircle } from './Icons';
import CompactFolderPicker from './CompactFolderPicker';
import { Button, Badge } from '../design-system';
import {
  loadTopics,
  addTopic as addTopicToStore,
  removeTopic as removeTopicFromStore,
  updateTopic as updateTopicInStore,
} from '../utils/topicSets';

const STORAGE_KEYS = {
  QUESTION_COUNT: 'vocaloop_quiz_q_count',
  AI_MODE:        'vocaloop_quiz_ai_mode',
  TARGET_SCORE:   'vocaloop_quiz_target_score',
  SOUND_ENABLED:  'vocaloop_quiz_sound_enabled',
  MIXED_MODES:    'vocaloop_quiz_mixed_modes',
  // 새 옵션 — TOEFL 전용 다양성 강화
  VOCAB_MODE:     'vocaloop_quiz_vocab_mode',     // 'off' | 'all' | 'folders'
  VOCAB_FOLDERS:  'vocaloop_quiz_vocab_folders',  // JSON [number]
  VOCAB_SAMPLE:   'vocaloop_quiz_vocab_sample',   // number
  TOPIC_ENABLED:  'vocaloop_quiz_topic_enabled',  // 'true' | 'false'
  TOPIC_IDS:      'vocaloop_quiz_topic_ids',      // JSON [string]
  TOPIC_PICK:     'vocaloop_quiz_topic_pick',     // number (1~2)
};

const VOCAB_SAMPLE_MIN = 5;
const VOCAB_SAMPLE_MAX = 25;
const VOCAB_SAMPLE_DEFAULT = 12;
const DEFAULT_MIXED_MODES = ['multiple', 'short', 'complete-word'];
const MIXED_MODE_OPTIONS = [
  {
    id: 'multiple',
    title: '객관식',
    desc: '뜻 선택으로 빠르게 확인',
    icon: CheckCircle,
  },
  {
    id: 'short',
    title: '주관식',
    desc: '한국어 뜻을 직접 입력',
    icon: Edit3,
  },
  {
    id: 'complete-word',
    title: 'Complete word',
    desc: '힌트로 영어 철자 완성',
    icon: Sparkles,
  },
];

/**
 * 섹션 헤더 — 아이콘 박스 + 타이틀 + 보조 설명.
 */
const SectionHead = ({ icon: Icon, title, subtitle, tone = 'neutral' }) => {
  const toneCls = {
    neutral: 'bg-surface-100 text-surface-600 shadow-[var(--shadow-soft)]',
    brand:   'bg-brand-50    text-brand-600   shadow-[var(--shadow-soft)]',
    warning: 'bg-warning-50  text-warning-600 shadow-[var(--shadow-soft)]',
    accent:  'bg-accent-50   text-accent-600  shadow-[var(--shadow-soft)]',
  }[tone];

  return (
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${toneCls}`}>
        <Icon className="w-5 h-5" aria-hidden="true" />
      </div>
      <div>
        <h4 className="font-black text-surface-900 tracking-tight">{title}</h4>
        <p className="text-2xs font-bold text-surface-400">{subtitle}</p>
      </div>
    </div>
  );
};

/**
 * 토글 카드 — 아이콘 + 라벨 + iOS 스타일 스위치.
 * tone: brand | warning | accent
 */
const ToggleCard = ({ on, onChange, title, desc, tone = 'brand', activeIcon: ActiveIcon }) => {
  const toneMap = {
    warning: { active: 'bg-warning-50/50 border-warning-200 shadow-xl shadow-warning-500/10', track: 'bg-warning-500', textOn: 'text-warning-900', dotIcon: 'text-warning-500' },
    accent:  { active: 'bg-accent-50/50  border-accent-300  shadow-xl shadow-accent-500/10',  track: 'bg-accent-600',  textOn: 'text-accent-900',  dotIcon: 'text-accent-600'  },
    brand:   { active: 'bg-brand-50/50   border-brand-500   shadow-xl shadow-brand-500/10',   track: 'bg-brand-500',   textOn: 'text-brand-900',   dotIcon: 'text-brand-500'   },
  };
  const toneCls = toneMap[tone] || toneMap.brand;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onChange}
      className={[
        'p-6 rounded-card border-2 transition-all flex items-center justify-between group h-[116px] text-left w-full',
        on ? toneCls.active : 'bg-white border-surface-100 hover:border-surface-200',
      ].join(' ')}
    >
      <div className="space-y-1.5 pr-4">
        <p className={`text-base font-black tracking-tight ${on ? toneCls.textOn : 'text-surface-700'}`}>
          {title}
        </p>
        <p className="text-xs font-bold text-surface-400 leading-relaxed opacity-80">
          {desc}
        </p>
      </div>
      <div className={`w-14 h-8 rounded-pill relative transition-all duration-500 shrink-0 ${
        on ? toneCls.track : 'bg-surface-200 shadow-inner'
      }`}>
        <div className={`absolute top-1 w-6 h-6 bg-white rounded-pill transition-all duration-500 shadow-[var(--shadow-card)] flex items-center justify-center ${
          on ? 'left-7' : 'left-1'
        }`}>
          {on && ActiveIcon && <ActiveIcon className={`w-3 h-3 ${toneCls.dotIcon}`} aria-hidden="true" />}
        </div>
      </div>
    </button>
  );
};

/**
 * 토픽 칩 — multi-select. tone:'accent' 사용. 빌트인은 X/편집 비활성, 사용자 정의는 노출.
 *
 * UI 원칙:
 * - 칩 전체는 한 줄 유지 (`whitespace-nowrap`).
 * - 텍스트는 `max-w-[160px] truncate` 로 폭 폭주 방지.
 * - 좌·우 패딩은 시각적으로 동등하게 — 빌트인(텍스트 only)은 `px-3.5`, 액션 버튼이 있는 경우는
 *   토글 영역 `pl-3.5 pr-2` + 버튼 자체에 `mr-1` 으로 우측 시각 여백을 동일하게 맞춤.
 */
const TopicChip = ({ topic, selected, onToggle, onRemove, onEdit }) => {
  const hasActions = !topic.builtIn;
  const baseRing = selected
    ? 'bg-accent-600 text-white border-transparent shadow-[var(--shadow-card)]'
    : 'bg-white text-surface-700 border-surface-200 hover:border-accent-300 hover:bg-accent-50/40';

  return (
    <div
      className={[
        'group inline-flex items-stretch shrink-0 max-w-full whitespace-nowrap',
        'rounded-pill border text-xs font-black tracking-tight transition-all',
        baseRing,
      ].join(' ')}
    >
      <button
        type="button"
        onClick={() => onToggle(topic.id)}
        title={topic.description || topic.label}
        aria-pressed={selected}
        className={[
          'inline-flex items-center gap-1.5 py-1.5',
          hasActions ? 'pl-3.5 pr-2' : 'px-3.5',
        ].join(' ')}
      >
        <span
          aria-hidden="true"
          className={`w-1.5 h-1.5 rounded-pill shrink-0 ${selected ? 'bg-white' : 'bg-accent-500'}`}
        />
        <span className="truncate max-w-[12rem]">{topic.label}</span>
      </button>

      {hasActions && (
        <div className="inline-flex items-center gap-0.5 pr-1.5">
          <button
            type="button"
            onClick={() => onEdit(topic)}
            aria-label={`${topic.label} 편집`}
            className={[
              'w-6 h-6 rounded-pill flex items-center justify-center transition-colors',
              selected ? 'text-white/80 hover:bg-white/20' : 'text-surface-400 hover:bg-surface-100',
            ].join(' ')}
          >
            <Edit3 className="w-3 h-3" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onRemove(topic.id)}
            aria-label={`${topic.label} 삭제`}
            className={[
              'w-6 h-6 rounded-pill flex items-center justify-center transition-colors',
              selected ? 'text-white/80 hover:bg-white/20' : 'text-surface-400 hover:bg-danger-50 hover:text-danger-500',
            ].join(' ')}
          >
            <X className="w-3 h-3" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
};

export default function QuizConfigModal({
  isOpen,
  onClose,
  mode,
  folders,
  words,
  onStart,
  initialAiMode,
}) {
  const [selectedFolderIds, setSelectedFolderIds] = useState([]);
  const [questionCount, setQuestionCount] = useState(10);
  const [targetScore, setTargetScore] = useState(100);
  const [aiMode, setAiMode] = useState(initialAiMode);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [mixedModeIds, setMixedModeIds] = useState(DEFAULT_MIXED_MODES);

  // 새 옵션: 단어 소스
  const [vocabMode, setVocabMode] = useState('off'); // 'off' | 'all' | 'folders'
  const [vocabFolderIds, setVocabFolderIds] = useState([]);
  const [vocabSampleSize, setVocabSampleSize] = useState(VOCAB_SAMPLE_DEFAULT);

  // 새 옵션: 주제 분야
  const [topicEnabled, setTopicEnabled] = useState(false);
  const [topics, setTopics] = useState([]);
  const [selectedTopicIds, setSelectedTopicIds] = useState([]);
  const [topicPickCount, setTopicPickCount] = useState(1);
  const [newTopicLabel, setNewTopicLabel] = useState('');
  const [newTopicDesc, setNewTopicDesc] = useState('');
  const [topicError, setTopicError] = useState('');
  const [editingTopic, setEditingTopic] = useState(null); // { id, label, description } | null

  const isToefl = mode?.id?.startsWith('toefl');
  const isMixed = mode?.id === 'mixed';

  useEffect(() => {
    if (!isOpen) return;
    const savedQCount  = localStorage.getItem(STORAGE_KEYS.QUESTION_COUNT);
    const savedAiMode  = localStorage.getItem(STORAGE_KEYS.AI_MODE);
    const savedTarget  = localStorage.getItem(STORAGE_KEYS.TARGET_SCORE);
    const savedSound   = localStorage.getItem(STORAGE_KEYS.SOUND_ENABLED);

    if (savedQCount) setQuestionCount(Number(savedQCount));
    if (savedAiMode !== null) setAiMode(savedAiMode === 'true');
    if (savedTarget) setTargetScore(Number(savedTarget));
    if (savedSound !== null) setSoundEnabled(savedSound === 'true');
    try {
      const savedMixedModes = JSON.parse(localStorage.getItem(STORAGE_KEYS.MIXED_MODES) || '[]');
      const normalized = Array.isArray(savedMixedModes)
        ? DEFAULT_MIXED_MODES.filter((id) => savedMixedModes.includes(id))
        : [];
      setMixedModeIds(normalized.length > 0 ? normalized : DEFAULT_MIXED_MODES);
    } catch {
      setMixedModeIds(DEFAULT_MIXED_MODES);
    }

    setSelectedFolderIds([]);

    // 새 옵션 로드 (TOEFL 모드일 때만 의미가 있지만, 모달이 열릴 때 초기화 일관성을 위해 전부 로드)
    const savedVocabMode    = localStorage.getItem(STORAGE_KEYS.VOCAB_MODE);
    const savedVocabFolders = localStorage.getItem(STORAGE_KEYS.VOCAB_FOLDERS);
    const savedVocabSample  = localStorage.getItem(STORAGE_KEYS.VOCAB_SAMPLE);
    const savedTopicOn      = localStorage.getItem(STORAGE_KEYS.TOPIC_ENABLED);
    const savedTopicIds     = localStorage.getItem(STORAGE_KEYS.TOPIC_IDS);
    const savedTopicPick    = localStorage.getItem(STORAGE_KEYS.TOPIC_PICK);

    setVocabMode(savedVocabMode === 'all' || savedVocabMode === 'folders' ? savedVocabMode : 'off');
    setVocabFolderIds(() => {
      try {
        const parsed = JSON.parse(savedVocabFolders || '[]');
        return Array.isArray(parsed) ? parsed.map(Number).filter((n) => !Number.isNaN(n)) : [];
      } catch {
        return [];
      }
    });
    setVocabSampleSize(() => {
      const n = Number(savedVocabSample);
      if (!Number.isFinite(n)) return VOCAB_SAMPLE_DEFAULT;
      return Math.max(VOCAB_SAMPLE_MIN, Math.min(VOCAB_SAMPLE_MAX, Math.round(n)));
    });

    setTopicEnabled(savedTopicOn === 'true');
    setTopics(loadTopics());
    setSelectedTopicIds(() => {
      try {
        const parsed = JSON.parse(savedTopicIds || '[]');
        return Array.isArray(parsed) ? parsed.filter((it) => typeof it === 'string') : [];
      } catch {
        return [];
      }
    });
    setTopicPickCount(() => {
      const n = Number(savedTopicPick);
      if (!Number.isFinite(n)) return 1;
      return Math.max(1, Math.min(3, Math.round(n)));
    });

    setNewTopicLabel('');
    setNewTopicDesc('');
    setTopicError('');
    setEditingTopic(null);
  }, [isOpen]);

  const filteredWords = selectedFolderIds.length > 0
    ? words.filter(w => selectedFolderIds.includes(w.folderId))
    : words;

  const maxQuestions = isToefl ? 10 : Math.max(1, filteredWords.length);

  useEffect(() => {
    if (isOpen) {
      if (questionCount > maxQuestions && !isToefl) {
        setQuestionCount(Math.min(10, maxQuestions));
      }
    }
  }, [isOpen, maxQuestions, isToefl]);

  // TOEFL 단어 풀 — 선택된 source 에 따라 결정
  const toeflVocabPool = useMemo(() => {
    if (!isToefl || vocabMode === 'off') return [];
    if (vocabMode === 'all') return words;
    return words.filter((w) => vocabFolderIds.includes(w.folderId));
  }, [isToefl, vocabMode, vocabFolderIds, words]);

  // 단어 소스 폴더 토글
  const toggleVocabFolder = (folderId) => {
    setVocabFolderIds((prev) =>
      prev.includes(folderId) ? prev.filter((id) => id !== folderId) : [...prev, folderId]
    );
  };

  const toggleTopic = (topicId) => {
    setSelectedTopicIds((prev) =>
      prev.includes(topicId) ? prev.filter((id) => id !== topicId) : [...prev, topicId]
    );
  };

  const handleAddTopic = () => {
    setTopicError('');
    try {
      const next = addTopicToStore(topics, { label: newTopicLabel, description: newTopicDesc });
      setTopics(next);
      setNewTopicLabel('');
      setNewTopicDesc('');
    } catch (err) {
      setTopicError(err.message || '분야 추가에 실패했습니다.');
    }
  };

  const handleRemoveTopic = (id) => {
    setTopicError('');
    try {
      const next = removeTopicFromStore(topics, id);
      setTopics(next);
      setSelectedTopicIds((prev) => prev.filter((it) => it !== id));
    } catch (err) {
      setTopicError(err.message || '분야 삭제에 실패했습니다.');
    }
  };

  const startEditTopic = (topic) => {
    setEditingTopic({ id: topic.id, label: topic.label, description: topic.description || '' });
    setTopicError('');
  };

  const commitEditTopic = () => {
    if (!editingTopic) return;
    setTopicError('');
    try {
      const next = updateTopicInStore(topics, editingTopic.id, {
        label: editingTopic.label,
        description: editingTopic.description,
      });
      setTopics(next);
      setEditingTopic(null);
    } catch (err) {
      setTopicError(err.message || '분야 수정에 실패했습니다.');
    }
  };

  const handleStart = () => {
    localStorage.setItem(STORAGE_KEYS.QUESTION_COUNT, questionCount.toString());
    localStorage.setItem(STORAGE_KEYS.AI_MODE, aiMode.toString());
    localStorage.setItem(STORAGE_KEYS.TARGET_SCORE, targetScore.toString());
    localStorage.setItem(STORAGE_KEYS.SOUND_ENABLED, soundEnabled.toString());
    if (isMixed) localStorage.setItem(STORAGE_KEYS.MIXED_MODES, JSON.stringify(mixedModeIds));

    if (isToefl) {
      localStorage.setItem(STORAGE_KEYS.VOCAB_MODE, vocabMode);
      localStorage.setItem(STORAGE_KEYS.VOCAB_FOLDERS, JSON.stringify(vocabFolderIds));
      localStorage.setItem(STORAGE_KEYS.VOCAB_SAMPLE, vocabSampleSize.toString());
      localStorage.setItem(STORAGE_KEYS.TOPIC_ENABLED, topicEnabled.toString());
      localStorage.setItem(STORAGE_KEYS.TOPIC_IDS, JSON.stringify(selectedTopicIds));
      localStorage.setItem(STORAGE_KEYS.TOPIC_PICK, topicPickCount.toString());
    }

    onStart({
      questionCount,
      selectedFolderIds,
      aiMode,
      targetScore,
      soundEnabled,
      adaptiveModes: isMixed ? mixedModeIds : [],
      // TOEFL 다양성 옵션
      vocabSource: isToefl
        ? { mode: vocabMode, folderIds: vocabFolderIds, sampleSize: vocabSampleSize, pool: toeflVocabPool }
        : { mode: 'off', folderIds: [], sampleSize: 0, pool: [] },
      topicSelection: isToefl
        ? {
            enabled: topicEnabled,
            allTopics: topics,
            selectedIds: selectedTopicIds,
            pickCount: topicPickCount,
          }
        : { enabled: false, allTopics: [], selectedIds: [], pickCount: 0 },
    });
  };

  const toggleFolder = (folderId) => {
    setSelectedFolderIds(prev =>
      prev.includes(folderId) ? prev.filter(id => id !== folderId) : [...prev, folderId]
    );
  };

  const toggleMixedMode = (modeId) => {
    setMixedModeIds((prev) => {
      if (prev.includes(modeId)) {
        return prev.length === 1 ? prev : prev.filter((id) => id !== modeId);
      }
      return DEFAULT_MIXED_MODES.filter((id) => [...prev, modeId].includes(id));
    });
  };

  if (!isOpen || !mode) return null;

  const headerGradient = mode.color === 'blue'
    ? 'bg-gradient-to-br from-brand-600 to-indigo-pair-700'
    : 'bg-gradient-to-br from-accent-600 to-indigo-pair-700';

  const startDisabled = (!isToefl && filteredWords.length === 0) || (isMixed && mixedModeIds.length === 0);
  // TOEFL 단어 소스가 켜졌는데 풀이 비어있으면 경고만 노출 (시작은 가능, 단어 미사용으로 fallback)
  const vocabPoolWarning =
    isToefl && vocabMode !== 'off' && toeflVocabPool.length === 0
      ? vocabMode === 'all'
        ? '단어장이 비어있어 단어 기반 출제가 불가합니다. 기본 출제로 진행됩니다.'
        : '선택한 폴더에 단어가 없습니다. 다른 폴더를 선택하거나 옵션을 꺼주세요.'
      : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-surface-900/60 backdrop-blur-md animate-in fade-in duration-500"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white rounded-hero shadow-[var(--shadow-floating)] border border-white/20 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
        {/* Header */}
        <div className={`p-10 sm:p-12 flex items-start justify-between relative overflow-hidden ${headerGradient}`}>
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-pill blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

          <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-2 text-white/60">
              <Settings className="w-4 h-4" aria-hidden="true" />
              <span className="text-2xs font-black uppercase tracking-[0.3em]">Configure Mode</span>
            </div>
            <h3 className="text-4xl font-black text-white tracking-tight">{mode.title}</h3>
            <p className="text-white/80 text-sm font-bold max-w-md leading-relaxed opacity-90">
              {mode.description}
            </p>
          </div>

          <button
            onClick={onClose}
            aria-label="설정 닫기"
            className="relative z-10 w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all active:scale-90 border border-white/10"
          >
            <X className="w-6 h-6" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-10 sm:p-12 space-y-12 custom-scrollbar">
          {/* Scope (folder picker) — Vocab quizzes only */}
          {!isToefl && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <SectionHead
                  icon={Layers}
                  title="출제 범위 설정"
                  subtitle="학습할 폴더를 가로로 스크롤하며 선택하세요"
                />
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setSelectedFolderIds([])}
                    className="text-2xs font-black text-surface-400 uppercase tracking-widest hover:text-brand-600 transition-colors"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={() => setSelectedFolderIds(folders.map(f => f.id))}
                    className="text-2xs font-black text-brand-600 uppercase tracking-widest hover:underline"
                  >
                    Select All
                  </button>
                </div>
              </div>

              <div className="bg-surface-50/50 p-6 rounded-card border border-surface-100">
                <CompactFolderPicker
                  folders={folders}
                  words={words}
                  selectedFolderId={null}
                  selectedFolderIds={selectedFolderIds}
                  onSelectFolder={toggleFolder}
                  wordCountByFolder={folders.reduce((acc, f) => {
                    acc[f.id] = words.filter(w => w.folderId === f.id).length;
                    return acc;
                  }, {})}
                  totalWordCount={words.length}
                  isMultiSelect={true}
                />
              </div>

              <div className="flex items-center gap-3 px-5 py-3 bg-brand-50/50 rounded-xl border border-brand-100/50 w-fit">
                <span className={`w-2 h-2 rounded-pill ${filteredWords.length > 0 ? 'bg-brand-500 animate-pulse' : 'bg-surface-300'}`} aria-hidden="true" />
                <p className="text-xs font-bold text-surface-600">
                  선택된 범위: <span className="text-brand-600 font-black text-sm">{filteredWords.length}</span>개의 단어
                </p>
              </div>
            </section>
          )}

          {isMixed && (
            <section className="space-y-6 pt-4 border-t border-surface-50">
              <div className="flex items-center justify-between gap-4">
                <SectionHead
                  icon={Sparkles}
                  title="복합 단계 구성"
                  subtitle="선택한 단계 순서대로 정답 시 난이도가 올라갑니다"
                  tone="warning"
                />
                <Badge tone="warning" size="xs">{mixedModeIds.length} Steps</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {MIXED_MODE_OPTIONS.map((option, index) => {
                  const selected = mixedModeIds.includes(option.id);
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => toggleMixedMode(option.id)}
                      aria-pressed={selected}
                      className={[
                        'relative p-5 rounded-card border-2 text-left transition-all min-h-[132px]',
                        selected
                          ? 'bg-warning-50/60 border-warning-300 shadow-xl shadow-warning-500/10'
                          : 'bg-white border-surface-100 hover:border-warning-200',
                      ].join(' ')}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          selected ? 'bg-warning-500 text-white' : 'bg-surface-100 text-surface-500'
                        }`}>
                          <Icon className="w-5 h-5" aria-hidden="true" />
                        </div>
                        <Badge tone={selected ? 'warning' : 'neutral'} size="xs">
                          {index + 1}
                        </Badge>
                      </div>
                      <p className={`text-sm font-black tracking-tight ${selected ? 'text-warning-900' : 'text-surface-700'}`}>
                        {option.title}
                      </p>
                      <p className="mt-1 text-xs font-bold leading-relaxed text-surface-400">
                        {option.desc}
                      </p>
                    </button>
                  );
                })}
              </div>

              <div className="bg-surface-50/70 border border-surface-100 rounded-card p-5">
                <p className="text-xs font-bold text-surface-500 leading-relaxed">
                  정답이면 다음 단계로 이동하고, 오답이면 같은 문제가 뒤로 재출제됩니다. 같은 단계에서 연속 오답이면 한 단계 쉬운 문제로 되돌아갑니다.
                </p>
              </div>
            </section>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Question count slider */}
            <section className="space-y-6">
              <SectionHead
                icon={Hash}
                title="문항 개수"
                subtitle="퀴즈당 출제될 문제 수를 정하세요"
              />

              <div className="space-y-6 px-1 pt-4">
                <div className="flex items-center justify-between">
                  <div className="relative">
                    <span className="text-5xl font-black text-surface-900 tracking-tighter">{questionCount}</span>
                    <Badge tone="brand" size="xs" className="absolute -top-4 -right-12">Items</Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-2xs font-black text-surface-400 uppercase tracking-widest mb-1">Max Questions</p>
                    <p className="text-sm font-black text-surface-600">{maxQuestions}</p>
                  </div>
                </div>

                <div className="relative py-2">
                  <input
                    type="range"
                    min={1}
                    max={maxQuestions}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    aria-label="문항 개수"
                    className="w-full h-3 bg-surface-100 rounded-pill appearance-none cursor-pointer accent-brand-600"
                  />
                  <div className="flex justify-between mt-4 text-2xs font-black text-surface-300 uppercase tracking-widest">
                    <span>1 Unit</span>
                    <span>{isToefl ? 'Limit 10' : 'Adaptive Max'}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Sound */}
            <section className="space-y-6">
              <SectionHead
                icon={Volume2}
                title="사운드 설정"
                subtitle="효과음 및 자동 발음 제어"
                tone="brand"
              />

              <ToggleCard
                on={soundEnabled}
                onChange={() => setSoundEnabled(v => !v)}
                title={`사운드 ${soundEnabled ? '활성화' : '비활성화'}`}
                desc={`발음 자동 재생 및 정답 효과음이 ${soundEnabled ? '들립니다.' : '나오지 않습니다.'}`}
                tone="brand"
                activeIcon={Volume2}
              />
            </section>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-4 border-t border-surface-50">
            {/* AI mode */}
            <section className="space-y-6">
              <SectionHead
                icon={Sparkles}
                title="AI 학습 모드"
                subtitle="지능형 채점 및 문맥 기반 생성"
                tone="warning"
              />

              <ToggleCard
                on={aiMode}
                onChange={() => setAiMode(v => !v)}
                title={`AI Assistant ${aiMode ? 'ON' : 'OFF'}`}
                desc="단어의 미세한 뉘앙스를 파악하고 지능형 문제를 생성합니다."
                tone="warning"
                activeIcon={Sparkles}
              />
            </section>

            {/* Target score (TOEFL) */}
            {isToefl && (
              <section className="space-y-6">
                <SectionHead
                  icon={Target}
                  title="목표 점수"
                  subtitle="학습의 난이도를 결정합니다"
                  tone="accent"
                />

                <div className="space-y-6 px-1 pt-4">
                  <div className="flex items-center justify-between">
                    <div className="relative">
                      <span className="text-5xl font-black text-accent-600 tracking-tighter">{targetScore}</span>
                      <Badge tone="accent" size="xs" className="absolute -top-4 -right-14">Score</Badge>
                    </div>
                  </div>

                  <div className="relative py-2">
                    <input
                      type="range"
                      min={60}
                      max={120}
                      step={5}
                      value={targetScore}
                      onChange={(e) => setTargetScore(Number(e.target.value))}
                      aria-label="목표 점수"
                      className="w-full h-3 bg-surface-100 rounded-pill appearance-none cursor-pointer accent-accent-600"
                    />
                    <div className="flex justify-between mt-4 text-2xs font-black text-surface-300 uppercase tracking-widest">
                      <span>Min 60</span>
                      <span>Max 120</span>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* TOEFL 전용: 단어 소스 + 주제 분야 */}
          {isToefl && (
            <>
              <section className="space-y-6 pt-4 border-t border-surface-50">
                <SectionHead
                  icon={BookOpen}
                  title="내 단어장 활용"
                  subtitle="수집한 단어들을 문제에 우선 노출시켜 학습 연계성 강화"
                  tone="brand"
                />

                <ToggleCard
                  on={vocabMode !== 'off'}
                  onChange={() => setVocabMode((prev) => (prev === 'off' ? 'all' : 'off'))}
                  title={`단어장 기반 출제 ${vocabMode === 'off' ? 'OFF' : 'ON'}`}
                  desc="내 단어장에서 추출한 단어를 활용해 매번 다른 문장과 문단을 생성합니다."
                  tone="brand"
                  activeIcon={BookOpen}
                />

                {vocabMode !== 'off' && (
                  <div className="space-y-5 bg-brand-50/40 border border-brand-100 rounded-card p-6">
                    {/* 모드 선택 */}
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-2xs font-black text-brand-700 uppercase tracking-widest shrink-0">단어 출처</p>
                      <div className="inline-flex shrink-0 whitespace-nowrap rounded-pill bg-white border border-brand-100 p-1 shadow-[var(--shadow-soft)]">
                        {[
                          { id: 'all',     label: '전체 단어' },
                          { id: 'folders', label: '폴더 선택' },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setVocabMode(opt.id)}
                            aria-pressed={vocabMode === opt.id}
                            className={[
                              'px-4 py-1.5 rounded-pill text-2xs font-black uppercase tracking-widest transition-all whitespace-nowrap',
                              vocabMode === opt.id
                                ? 'bg-brand-600 text-white shadow-[var(--shadow-card)]'
                                : 'text-brand-600 hover:bg-brand-50',
                            ].join(' ')}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 폴더 선택 */}
                    {vocabMode === 'folders' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-2xs font-black text-brand-700 uppercase tracking-widest">대상 폴더</p>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setVocabFolderIds([])}
                              className="text-2xs font-black text-surface-400 uppercase tracking-widest hover:text-brand-600 transition-colors"
                            >
                              Clear
                            </button>
                            <button
                              type="button"
                              onClick={() => setVocabFolderIds(folders.map((f) => f.id))}
                              className="text-2xs font-black text-brand-600 uppercase tracking-widest hover:underline"
                            >
                              Select All
                            </button>
                          </div>
                        </div>

                        {folders.length === 0 ? (
                          <div className="bg-white border border-dashed border-surface-200 rounded-card p-5 text-center">
                            <p className="text-xs font-bold text-surface-500">등록된 폴더가 없습니다. 단어장에서 폴더를 먼저 생성해주세요.</p>
                          </div>
                        ) : (
                          <div className="bg-white rounded-card border border-surface-100 p-3">
                            <CompactFolderPicker
                              folders={folders}
                              words={words}
                              selectedFolderId={null}
                              selectedFolderIds={vocabFolderIds}
                              onSelectFolder={toggleVocabFolder}
                              wordCountByFolder={folders.reduce((acc, f) => {
                                acc[f.id] = words.filter((w) => w.folderId === f.id).length;
                                return acc;
                              }, {})}
                              totalWordCount={words.length}
                              isMultiSelect={true}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* 샘플 사이즈 */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-2xs font-black text-brand-700 uppercase tracking-widest">샘플 단어 개수</p>
                        <span className="text-2xs font-black text-surface-500">최대 {VOCAB_SAMPLE_MAX}개</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min={VOCAB_SAMPLE_MIN}
                          max={VOCAB_SAMPLE_MAX}
                          step={1}
                          value={vocabSampleSize}
                          onChange={(e) => setVocabSampleSize(Number(e.target.value))}
                          aria-label="샘플 단어 개수"
                          className="flex-1 h-2 bg-surface-100 rounded-pill appearance-none cursor-pointer accent-brand-600"
                        />
                        <span className="text-3xl font-black text-brand-700 tracking-tighter w-12 text-right">{vocabSampleSize}</span>
                      </div>
                      <p className="text-xs font-bold text-surface-500 leading-relaxed">
                        선택한 풀에서 매 세션마다 무작위로 {vocabSampleSize}개 단어를 뽑아 AI 프롬프트에 포함시킵니다.
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-white rounded-pill border border-brand-100">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-pill ${toeflVocabPool.length > 0 ? 'bg-brand-500 animate-pulse' : 'bg-surface-300'}`} aria-hidden="true" />
                        <p className="text-2xs font-black text-surface-600 uppercase tracking-widest">현재 풀</p>
                      </div>
                      <p className="text-sm font-black text-brand-700">{toeflVocabPool.length}개 단어</p>
                    </div>

                    {vocabPoolWarning && (
                      <p className="text-2xs font-black text-warning-700 bg-warning-50 border border-warning-200 rounded-pill px-4 py-1.5 w-fit">
                        {vocabPoolWarning}
                      </p>
                    )}
                  </div>
                )}
              </section>

              <section className="space-y-6 pt-4 border-t border-surface-50">
                <SectionHead
                  icon={Sparkles}
                  title="주제 분야"
                  subtitle="사전 정의된 분야 set 에서 무작위 픽 — 같은 모드에서도 다양성 확보"
                  tone="accent"
                />

                <ToggleCard
                  on={topicEnabled}
                  onChange={() => setTopicEnabled((v) => !v)}
                  title={`분야 강조 ${topicEnabled ? 'ON' : 'OFF'}`}
                  desc="선택한 분야 중 일부를 무작위로 뽑아 AI 프롬프트에 전달합니다."
                  tone="accent"
                  activeIcon={Sparkles}
                />

                {topicEnabled && (
                  <div className="space-y-5 bg-accent-50/30 border border-accent-100 rounded-card p-6">
                    <div className="flex items-center justify-between">
                      <p className="text-2xs font-black text-accent-700 uppercase tracking-widest">분야 선택 (multi-select)</p>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedTopicIds([])}
                          className="text-2xs font-black text-surface-400 uppercase tracking-widest hover:text-accent-600 transition-colors"
                        >
                          Clear
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedTopicIds(topics.map((t) => t.id))}
                          className="text-2xs font-black text-accent-600 uppercase tracking-widest hover:underline"
                        >
                          Select All
                        </button>
                      </div>
                    </div>

                    <div className="bg-white rounded-card border border-surface-100 p-4">
                      <div className="flex flex-wrap gap-2">
                        {topics.map((topic) => (
                          <TopicChip
                            key={topic.id}
                            topic={topic}
                            selected={selectedTopicIds.includes(topic.id)}
                            onToggle={toggleTopic}
                            onRemove={handleRemoveTopic}
                            onEdit={startEditTopic}
                          />
                        ))}
                      </div>
                    </div>

                    {/* 픽 개수 */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-2xs font-black text-accent-700 uppercase tracking-widest shrink-0">픽 개수</p>
                        <span className="text-2xs font-black text-surface-500 shrink-0">매 세션마다 무작위 N개</span>
                      </div>
                      <div className="inline-flex shrink-0 whitespace-nowrap rounded-pill bg-white border border-accent-100 p-1 shadow-[var(--shadow-soft)]">
                        {[1, 2, 3].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setTopicPickCount(n)}
                            aria-pressed={topicPickCount === n}
                            className={[
                              'w-10 h-8 rounded-pill text-xs font-black transition-all',
                              topicPickCount === n
                                ? 'bg-accent-600 text-white shadow-[var(--shadow-card)]'
                                : 'text-accent-600 hover:bg-accent-50',
                            ].join(' ')}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 새 분야 추가 */}
                    {editingTopic ? (
                      <div className="space-y-3 bg-white rounded-card border border-accent-200 p-5">
                        <p className="text-2xs font-black text-accent-700 uppercase tracking-widest">분야 편집</p>
                        <input
                          type="text"
                          value={editingTopic.label}
                          onChange={(e) => setEditingTopic((prev) => ({ ...prev, label: e.target.value }))}
                          placeholder="분야 이름"
                          aria-label="분야 이름"
                          className="w-full text-sm px-3 py-2.5 border border-surface-200 rounded-md bg-surface-50 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:bg-white"
                        />
                        <input
                          type="text"
                          value={editingTopic.description}
                          onChange={(e) => setEditingTopic((prev) => ({ ...prev, description: e.target.value }))}
                          placeholder="설명 (선택) — 예: Cosmology, Planetary Science"
                          aria-label="분야 설명"
                          className="w-full text-sm px-3 py-2.5 border border-surface-200 rounded-md bg-surface-50 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:bg-white"
                        />
                        {topicError && <p className="text-2xs font-black text-danger-500">{topicError}</p>}
                        <div className="flex gap-2">
                          <Button variant="secondary" size="sm" onClick={() => { setEditingTopic(null); setTopicError(''); }}>
                            취소
                          </Button>
                          <Button variant="primary" size="sm" onClick={commitEditTopic} disabled={!editingTopic.label.trim()}>
                            수정 완료
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 bg-white rounded-card border border-surface-100 p-5">
                        <p className="text-2xs font-black text-accent-700 uppercase tracking-widest">새 분야 추가</p>
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.4fr_auto] gap-2">
                          <input
                            type="text"
                            value={newTopicLabel}
                            onChange={(e) => setNewTopicLabel(e.target.value)}
                            placeholder="예: 인류학"
                            aria-label="새 분야 이름"
                            className="min-w-0 text-sm px-3 py-2.5 border border-surface-200 rounded-md bg-surface-50 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:bg-white"
                          />
                          <input
                            type="text"
                            value={newTopicDesc}
                            onChange={(e) => setNewTopicDesc(e.target.value)}
                            placeholder="설명 (선택)"
                            aria-label="새 분야 설명"
                            className="min-w-0 text-sm px-3 py-2.5 border border-surface-200 rounded-md bg-surface-50 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:bg-white"
                          />
                          <Button
                            variant="primary"
                            size="sm"
                            leftIcon={Plus}
                            onClick={handleAddTopic}
                            disabled={!newTopicLabel.trim()}
                          >
                            추가
                          </Button>
                        </div>
                        {topicError && <p className="text-2xs font-black text-danger-500">{topicError}</p>}
                        <p className="text-2xs font-bold text-surface-400 leading-relaxed">
                          기본 분야는 삭제되지 않습니다. 사용자 정의 분야만 편집/삭제 가능합니다.
                        </p>
                      </div>
                    )}

                    {/* 선택 요약 */}
                    <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-white rounded-pill border border-accent-100">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-pill ${selectedTopicIds.length > 0 ? 'bg-accent-600 animate-pulse' : 'bg-surface-300'}`} aria-hidden="true" />
                        <p className="text-2xs font-black text-surface-600 uppercase tracking-widest">선택된 분야</p>
                      </div>
                      <p className="text-sm font-black text-accent-700">
                        {selectedTopicIds.length}개 · 픽 {Math.min(topicPickCount, Math.max(selectedTopicIds.length, 1))}/세션
                      </p>
                    </div>
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-10 sm:p-12 bg-white border-t border-surface-100 flex flex-col sm:flex-row items-center gap-5">
          <Button
            variant="ghost"
            size="lg"
            onClick={onClose}
            className="w-full sm:flex-1 !h-16 !text-base"
          >
            뒤로 가기
          </Button>
          <Button
            variant={startDisabled ? 'secondary' : 'primary'}
            size="lg"
            disabled={startDisabled}
            onClick={handleStart}
            rightIcon={Play}
            className="w-full sm:flex-[2] !h-16 !text-lg"
          >
            퀴즈 시작하기
          </Button>
        </div>
      </div>
    </div>
  );
}
