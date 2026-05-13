import React from 'react';
import MultipleChoiceQuiz from './MultipleChoiceQuiz';
import ShortAnswerQuiz from './ShortAnswerQuiz';
import CompleteWordQuiz from './CompleteWordQuiz';
import ToeflCompleteTheWordQuiz from './ToeflCompleteTheWordQuiz';
import ToeflBuildSentenceQuiz from './ToeflBuildSentenceQuiz';
import ToeflReadingTaskQuiz from './ToeflReadingTaskQuiz';
import ToeflReadingMockTest from './ToeflReadingMockTest';
import ToeflWritingTaskQuiz from './ToeflWritingTaskQuiz';
import ToeflWritingMockTest from './ToeflWritingMockTest';
import { getReadingTaskType, getWritingTaskType } from './quizModeRegistry';

export default function QuizModeContent({
  selectedMode,
  adaptiveMode,
  adaptiveTask,
  adaptiveProgress,
  queue,
  currentIndex,
  stats,
  words,
  aiMode,
  aiConfig,
  soundEnabled,
  onAnswer,
  toeflConfig,
  onExit,
  user,
  reviewAsset,
  onAssetCreated,
  onAttemptRecorded,
  onSaveVocabularyWord,
  onExplainVocabularyWord,
}) {
  const modeId = selectedMode?.id;
  const readingTaskType = getReadingTaskType(modeId);
  const writingTaskType = getWritingTaskType(modeId);

  if (modeId === 'multiple') {
    return (
      <MultipleChoiceQuiz
        word={queue[currentIndex]}
        allWords={words}
        onAnswer={onAnswer}
        progress={{ current: currentIndex + 1, total: queue.length }}
        stats={stats}
        aiMode={aiMode}
        aiConfig={aiConfig}
        soundEnabled={soundEnabled}
      />
    );
  }

  if (modeId === 'mixed' && adaptiveMode === 'multiple') {
    return (
      <MultipleChoiceQuiz
        word={adaptiveTask.word}
        allWords={words}
        onAnswer={onAnswer}
        progress={adaptiveProgress}
        stats={stats}
        aiMode={aiMode}
        aiConfig={aiConfig}
        soundEnabled={soundEnabled}
      />
    );
  }

  if (modeId === 'short') {
    return (
      <ShortAnswerQuiz
        word={queue[currentIndex]}
        onAnswer={onAnswer}
        progress={{ current: currentIndex + 1, total: queue.length }}
        stats={stats}
        aiMode={aiMode}
        aiConfig={aiConfig}
        soundEnabled={soundEnabled}
      />
    );
  }

  if (modeId === 'mixed' && adaptiveMode === 'short') {
    return (
      <ShortAnswerQuiz
        word={adaptiveTask.word}
        onAnswer={onAnswer}
        progress={adaptiveProgress}
        stats={stats}
        aiMode={aiMode}
        aiConfig={aiConfig}
        soundEnabled={soundEnabled}
      />
    );
  }

  if (modeId === 'mixed' && adaptiveMode === 'complete-word') {
    return (
      <CompleteWordQuiz
        word={adaptiveTask.word}
        onAnswer={onAnswer}
        progress={adaptiveProgress}
        stats={stats}
        aiMode={aiMode}
        soundEnabled={soundEnabled}
      />
    );
  }

  if (modeId === 'toefl-complete') {
    return (
      <ToeflCompleteTheWordQuiz
        aiConfig={aiConfig}
        questionCount={toeflConfig.questionCount}
        targetScore={toeflConfig.targetScore}
        vocabSource={toeflConfig.vocabSource}
        topicSelection={toeflConfig.topicSelection}
        onExit={onExit}
        user={user}
        reviewAsset={reviewAsset}
        onAssetCreated={onAssetCreated}
        onAttemptRecorded={onAttemptRecorded}
      />
    );
  }

  if (modeId === 'toefl-build') {
    return (
      <ToeflBuildSentenceQuiz
        aiConfig={aiConfig}
        questionCount={toeflConfig.questionCount}
        targetScore={toeflConfig.targetScore}
        vocabSource={toeflConfig.vocabSource}
        topicSelection={toeflConfig.topicSelection}
        onExit={onExit}
        reviewAsset={reviewAsset}
        onAssetCreated={onAssetCreated}
        onAttemptRecorded={onAttemptRecorded}
      />
    );
  }

  if (readingTaskType) {
    return (
      <ToeflReadingTaskQuiz
        aiConfig={aiConfig}
        taskType={readingTaskType}
        questionCount={toeflConfig.questionCount}
        targetScore={toeflConfig.targetScore}
        vocabSource={toeflConfig.vocabSource}
        topicSelection={toeflConfig.topicSelection}
        onExit={onExit}
        existingWords={words}
        onSaveVocabularyWord={onSaveVocabularyWord}
        onExplainVocabularyWord={onExplainVocabularyWord}
        reviewAsset={reviewAsset}
        onAssetCreated={onAssetCreated}
        onAttemptRecorded={onAttemptRecorded}
      />
    );
  }

  if (modeId === 'toefl-reading-mock') {
    return (
      <ToeflReadingMockTest
        aiConfig={aiConfig}
        questionCount={toeflConfig.questionCount}
        targetScore={toeflConfig.targetScore}
        vocabSource={toeflConfig.vocabSource}
        topicSelection={toeflConfig.topicSelection}
        onExit={onExit}
        existingWords={words}
        onSaveVocabularyWord={onSaveVocabularyWord}
        onExplainVocabularyWord={onExplainVocabularyWord}
        reviewAsset={reviewAsset}
        onAssetCreated={onAssetCreated}
        onAttemptRecorded={onAttemptRecorded}
      />
    );
  }

  if (writingTaskType) {
    return (
      <ToeflWritingTaskQuiz
        aiConfig={aiConfig}
        taskType={writingTaskType}
        targetScore={toeflConfig.targetScore}
        vocabSource={toeflConfig.vocabSource}
        topicSelection={toeflConfig.topicSelection}
        onExit={onExit}
        reviewAsset={reviewAsset}
        onAssetCreated={onAssetCreated}
        onAttemptRecorded={onAttemptRecorded}
      />
    );
  }

  if (modeId === 'toefl-writing-mock') {
    return (
      <ToeflWritingMockTest
        aiConfig={aiConfig}
        targetScore={toeflConfig.targetScore}
        vocabSource={toeflConfig.vocabSource}
        topicSelection={toeflConfig.topicSelection}
        onExit={onExit}
        reviewAsset={reviewAsset}
        onAssetCreated={onAssetCreated}
        onAttemptRecorded={onAttemptRecorded}
      />
    );
  }

  return null;
}
