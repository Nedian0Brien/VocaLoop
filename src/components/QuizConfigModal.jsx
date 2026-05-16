import React from 'react';
import { X, Settings, Layers, Hash, Sparkles, Play, Volume2, Target, BookOpen, Plus, Edit3, CheckCircle } from './Icons';
import CompactFolderPicker from './CompactFolderPicker';
import { Button, Badge } from '../design-system';
import {
  VOCAB_SAMPLE_MAX,
  VOCAB_SAMPLE_MIN,
} from './quizConfig/quizConfigConstants';
import { SectionHead, ToggleCard, TopicChip } from './quizConfig/QuizConfigControls';
import { useQuizConfigState } from './quizConfig/useQuizConfigState';
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

export default function QuizConfigModal({
  isOpen,
  onClose,
  mode,
  folders,
  words,
  onStart,
  initialAiMode,
}) {
  const {
    aiMode,
    commitEditTopic,
    countBadge,
    countSubtitle,
    countTitle,
    countValue,
    editingTopic,
    filteredWords,
    handleAddTopic,
    handleRemoveTopic,
    handleStart,
    isMixed,
    isToefl,
    maxQuestions,
    maxStudySetSize,
    mixedModeIds,
    newTopicDesc,
    newTopicLabel,
    selectedFolderIds,
    selectedTopicIds,
    setAiMode,
    setEditingTopic,
    setNewTopicDesc,
    setNewTopicLabel,
    setQuestionCount,
    setSelectedFolderIds,
    setSelectedTopicIds,
    setSoundEnabled,
    setStudySetSize,
    setTargetScore,
    setTopicEnabled,
    setTopicError,
    setTopicPickCount,
    setVocabFolderIds,
    setVocabMode,
    setVocabSampleSize,
    soundEnabled,
    startDisabled,
    startEditTopic,
    targetScore,
    toeflVocabPool,
    toggleFolder,
    toggleMixedMode,
    toggleTopic,
    toggleVocabFolder,
    topicEnabled,
    topicError,
    topicPickCount,
    topics,
    vocabFolderIds,
    vocabMode,
    vocabPoolWarning,
    vocabSampleSize,
  } = useQuizConfigState({
    isOpen,
    mode,
    words,
    initialAiMode,
    onStart,
  });

  if (!isOpen || !mode) return null;

  const headerGradient = mode.color === 'blue'
    ? 'bg-gradient-to-br from-brand-600 to-indigo-pair-700'
    : 'bg-gradient-to-br from-accent-600 to-indigo-pair-700';

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center overflow-hidden p-2 sm:items-center sm:p-6" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-surface-900/60 backdrop-blur-md animate-in fade-in duration-500"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        data-testid="quiz-config-panel"
        className="relative flex min-h-0 w-full max-w-2xl flex-col overflow-hidden rounded-hero border border-white/20 bg-white shadow-[var(--shadow-floating)] max-h-[calc(100dvh-1rem)] sm:max-h-[90vh] animate-in zoom-in-95 slide-in-from-bottom-10 duration-500"
      >
        {/* Header */}
        <div className={`relative flex items-start justify-between gap-4 overflow-hidden p-6 sm:p-12 ${headerGradient}`}>
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-pill blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

          <div className="relative z-10 min-w-0 space-y-2 sm:space-y-3">
            <div className="flex items-center gap-2 text-white/60">
              <Settings className="w-4 h-4" aria-hidden="true" />
              <span className="text-2xs font-black uppercase tracking-[0.3em]">Configure Mode</span>
            </div>
            <h3 className="text-3xl font-black text-white tracking-tight sm:text-4xl">{mode.title}</h3>
            <p className="hidden max-w-md text-sm font-bold leading-relaxed text-white/80 opacity-90 sm:block">
              {mode.description}
            </p>
          </div>

          <button
            onClick={onClose}
            aria-label="설정 닫기"
            className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white transition-all hover:bg-white/20 active:scale-90 sm:h-12 sm:w-12 sm:rounded-2xl"
          >
            <X className="w-6 h-6" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div data-testid="quiz-config-body" className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-6 space-y-8 sm:p-12 sm:space-y-12">
          {/* Scope (folder picker) — Vocab quizzes only */}
          {!isToefl && (
            <section className="space-y-5 sm:space-y-6">
              <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
                <SectionHead
                  icon={Layers}
                  title="출제 범위 설정"
                  subtitle="학습할 폴더를 가로로 스크롤하며 선택하세요"
                />
                <div data-testid="quiz-config-scope-actions" className="flex self-start items-center gap-2 rounded-pill bg-surface-50 p-1 sm:gap-4 sm:bg-transparent sm:p-0">
                  <button
                    onClick={() => setSelectedFolderIds([])}
                    className="rounded-pill px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-surface-400 transition-colors hover:text-brand-600 sm:px-0 sm:py-0 sm:text-2xs sm:tracking-widest"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={() => setSelectedFolderIds(folders.map(f => f.id))}
                    className="rounded-pill px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-brand-600 hover:underline sm:px-0 sm:py-0 sm:text-2xs sm:tracking-widest"
                  >
                    Select All
                  </button>
                </div>
              </div>

              <div className="rounded-card border border-surface-100 bg-surface-50/50 p-4 sm:p-6">
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

              <div className="flex w-full items-center gap-3 rounded-xl border border-brand-100/50 bg-brand-50/50 px-4 py-3 sm:w-fit sm:px-5">
                <span className={`w-2 h-2 rounded-pill ${filteredWords.length > 0 ? 'bg-brand-500 animate-pulse' : 'bg-surface-300'}`} aria-hidden="true" />
                <p className="text-xs font-bold text-surface-600">
                  선택된 범위: <span className="text-brand-600 font-black text-sm">{filteredWords.length}</span>개의 단어
                </p>
              </div>
            </section>
          )}

          {isMixed && (
            <section className="space-y-5 border-t border-surface-50 pt-2 sm:space-y-6 sm:pt-4">
              <div className="flex items-start justify-between gap-3 sm:items-center sm:gap-4">
                <SectionHead
                  icon={Sparkles}
                  title="복합 단계 구성"
                  subtitle="선택한 단계 순서대로 정답 시 난이도가 올라갑니다"
                  tone="warning"
                />
                <Badge tone="warning" size="xs" className="shrink-0">{mixedModeIds.length} Steps</Badge>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
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
                        'relative min-h-[104px] rounded-card border-2 p-4 text-left transition-all sm:min-h-[132px] sm:p-5',
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
                title={countTitle}
                subtitle={countSubtitle}
              />

              <div className="space-y-6 px-1 pt-4">
                <div className="flex items-center justify-between">
                  <div className="relative">
                    <span className="text-5xl font-black text-surface-900 tracking-tighter">{countValue}</span>
                    <Badge tone="brand" size="xs" className="absolute -top-4 -right-12">{countBadge}</Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-2xs font-black text-surface-400 uppercase tracking-widest mb-1">
                      {isMixed ? 'Total Words' : 'Max Questions'}
                    </p>
                    <p className="text-sm font-black text-surface-600">{isMixed ? maxStudySetSize : maxQuestions}</p>
                  </div>
                </div>

                <div className="relative py-2">
                  <input
                    type="range"
                    min={1}
                    max={isMixed ? maxStudySetSize : maxQuestions}
                    value={countValue}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      if (isMixed) setStudySetSize(next);
                      else setQuestionCount(next);
                    }}
                    aria-label={countTitle}
                    className="w-full h-3 bg-surface-100 rounded-pill appearance-none cursor-pointer accent-brand-600"
                  />
                  <div className="flex justify-between mt-4 text-2xs font-black text-surface-300 uppercase tracking-widest">
                    <span>{isMixed ? '1 Word' : '1 Unit'}</span>
                    <span>{isMixed ? 'Set Size' : isToefl ? 'Limit 10' : 'Adaptive Max'}</span>
                  </div>
                </div>
                {isMixed && (
                  <p className="text-xs font-bold text-surface-500 leading-relaxed">
                    전체 단어를 {countValue}개씩 묶어 세트별로 진행합니다. 각 세트가 끝나면 잠깐 멈추고 다음 학습으로 넘어갈 수 있습니다.
                  </p>
                )}
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
        <div data-testid="quiz-config-footer" className="flex shrink-0 flex-col items-center gap-3 border-t border-surface-100 bg-white px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:flex-row sm:gap-5 sm:p-12">
          <Button
            variant="ghost"
            size="lg"
            onClick={onClose}
            className="w-full !h-12 !text-sm sm:flex-1 sm:!h-16 sm:!text-base"
          >
            뒤로 가기
          </Button>
          <Button
            variant={startDisabled ? 'secondary' : 'primary'}
            size="lg"
            disabled={startDisabled}
            onClick={handleStart}
            rightIcon={Play}
            className="w-full !h-12 !text-base sm:flex-[2] sm:!h-16 sm:!text-lg"
          >
            퀴즈 시작하기
          </Button>
        </div>
      </div>
    </div>
  );
}
