import React from 'react';
import { X, Settings, Play } from './Icons';
import { Button } from '../design-system';
import {
  AiDifficultySections,
  CountAndSoundSections,
  MixedModeSection,
  ToeflVocabSourceSection,
  TopicSelectionSection,
  VocabScopeSection,
} from './quizConfig/QuizConfigSections';
import { useQuizConfigState } from './quizConfig/useQuizConfigState';
import { wordBelongsToFolder } from '../utils/appDataTransforms';

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
    setWordScope,
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
    wordScope,
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
  const flaggedWordCount = words.filter((word) => word?.isFlagged || word?.is_flagged).length;
  const wordCountByFolder = folders.reduce((acc, f) => {
    acc[f.id] = words.filter(w => wordBelongsToFolder(w, f.id)).length;
    return acc;
  }, {});

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
          {!isToefl && (
            <VocabScopeSection
              filteredWords={filteredWords}
              flaggedWordCount={flaggedWordCount}
              folders={folders}
              selectedFolderIds={selectedFolderIds}
              setSelectedFolderIds={setSelectedFolderIds}
              setWordScope={setWordScope}
              toggleFolder={toggleFolder}
              wordCountByFolder={wordCountByFolder}
              wordScope={wordScope}
              words={words}
            />
          )}

          {isMixed && (
            <MixedModeSection mixedModeIds={mixedModeIds} toggleMixedMode={toggleMixedMode} />
          )}

          <CountAndSoundSections
            countBadge={countBadge}
            countSubtitle={countSubtitle}
            countTitle={countTitle}
            countValue={countValue}
            isMixed={isMixed}
            isToefl={isToefl}
            maxQuestions={maxQuestions}
            maxStudySetSize={maxStudySetSize}
            setQuestionCount={setQuestionCount}
            setSoundEnabled={setSoundEnabled}
            setStudySetSize={setStudySetSize}
            soundEnabled={soundEnabled}
          />

          <AiDifficultySections
            aiMode={aiMode}
            isToefl={isToefl}
            setAiMode={setAiMode}
            setTargetScore={setTargetScore}
            targetScore={targetScore}
          />

          {isToefl && (
            <>
              <ToeflVocabSourceSection
                folders={folders}
                setVocabFolderIds={setVocabFolderIds}
                setVocabMode={setVocabMode}
                setVocabSampleSize={setVocabSampleSize}
                toeflVocabPool={toeflVocabPool}
                toggleVocabFolder={toggleVocabFolder}
                vocabFolderIds={vocabFolderIds}
                vocabMode={vocabMode}
                vocabPoolWarning={vocabPoolWarning}
                vocabSampleSize={vocabSampleSize}
                words={words}
              />
              <TopicSelectionSection
                commitEditTopic={commitEditTopic}
                editingTopic={editingTopic}
                handleAddTopic={handleAddTopic}
                handleRemoveTopic={handleRemoveTopic}
                newTopicDesc={newTopicDesc}
                newTopicLabel={newTopicLabel}
                selectedTopicIds={selectedTopicIds}
                setEditingTopic={setEditingTopic}
                setNewTopicDesc={setNewTopicDesc}
                setNewTopicLabel={setNewTopicLabel}
                setSelectedTopicIds={setSelectedTopicIds}
                setTopicEnabled={setTopicEnabled}
                setTopicError={setTopicError}
                setTopicPickCount={setTopicPickCount}
                startEditTopic={startEditTopic}
                toggleTopic={toggleTopic}
                topicEnabled={topicEnabled}
                topicError={topicError}
                topicPickCount={topicPickCount}
                topics={topics}
              />
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
