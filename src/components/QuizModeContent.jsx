import React from 'react';
import MultipleChoiceQuiz from './MultipleChoiceQuiz';
import ShortAnswerQuiz from './ShortAnswerQuiz';
import CompleteWordQuiz from './CompleteWordQuiz';
import FlashcardQuiz from './FlashcardQuiz';
import ToeflCompleteTheWordQuiz from './ToeflCompleteTheWordQuiz';
import ToeflBuildSentenceQuiz from './ToeflBuildSentenceQuiz';
import ToeflReadingTaskQuiz from './ToeflReadingTaskQuiz';
import ToeflReadingMockTest from './ToeflReadingMockTest';
import ToeflWritingTaskQuiz from './ToeflWritingTaskQuiz';
import ToeflWritingMockTest from './ToeflWritingMockTest';
import { getReadingTaskType, getWritingTaskType } from './quizModeRegistry';

const regularProgress = ({ currentIndex, queue }) => ({
  current: currentIndex + 1,
  total: queue.length,
});

const toeflPracticeProps = ({
  aiConfig,
  onAssetCreated,
  onAttemptRecorded,
  onExit,
  reviewAsset,
  toeflConfig,
}) => ({
  aiConfig,
  questionCount: toeflConfig.questionCount,
  targetScore: toeflConfig.targetScore,
  vocabSource: toeflConfig.vocabSource,
  topicSelection: toeflConfig.topicSelection,
  onExit,
  reviewAsset,
  onAssetCreated,
  onAttemptRecorded,
});

const QUIZ_RENDERERS = [
  {
    matches: ({ modeId }) => modeId === 'multiple',
    render: (props) => (
      <MultipleChoiceQuiz
        word={props.queue[props.currentIndex]}
        allWords={props.words}
        onAnswer={props.onAnswer}
        progress={regularProgress(props)}
        stats={props.stats}
        aiMode={props.aiMode}
        aiConfig={props.aiConfig}
        soundEnabled={props.soundEnabled}
      />
    ),
  },
  {
    matches: ({ modeId, adaptiveMode }) => modeId === 'mixed' && adaptiveMode === 'multiple',
    render: (props) => (
      <MultipleChoiceQuiz
        word={props.adaptiveTask.word}
        allWords={props.words}
        onAnswer={props.onAnswer}
        progress={props.adaptiveProgress}
        stats={props.stats}
        aiMode={props.aiMode}
        aiConfig={props.aiConfig}
        soundEnabled={props.soundEnabled}
      />
    ),
  },
  {
    matches: ({ modeId, adaptiveMode }) => modeId === 'mixed' && adaptiveMode === 'flashcard',
    render: (props) => (
      <FlashcardQuiz
        word={props.adaptiveTask.word}
        onAnswer={props.onAnswer}
        progress={props.adaptiveProgress}
        stats={props.stats}
        soundEnabled={props.soundEnabled}
      />
    ),
  },
  {
    matches: ({ modeId }) => modeId === 'short',
    render: (props) => (
      <ShortAnswerQuiz
        word={props.queue[props.currentIndex]}
        onAnswer={props.onAnswer}
        progress={regularProgress(props)}
        stats={props.stats}
        aiMode={props.aiMode}
        aiConfig={props.aiConfig}
        soundEnabled={props.soundEnabled}
        direction="en-ko"
        onAcceptedAnswer={props.onAcceptedAnswer}
      />
    ),
  },
  {
    matches: ({ modeId, adaptiveMode }) =>
      modeId === 'mixed' && ['short', 'short-en-ko', 'short-ko-en'].includes(adaptiveMode),
    render: (props) => (
      <ShortAnswerQuiz
        word={props.adaptiveTask.word}
        onAnswer={props.onAnswer}
        progress={props.adaptiveProgress}
        stats={props.stats}
        aiMode={props.aiMode}
        aiConfig={props.aiConfig}
        soundEnabled={props.soundEnabled}
        direction={props.adaptiveMode === 'short-ko-en' ? 'ko-en' : 'en-ko'}
        onAcceptedAnswer={props.onAcceptedAnswer}
      />
    ),
  },
  {
    matches: ({ modeId, adaptiveMode }) => modeId === 'mixed' && adaptiveMode === 'complete-word',
    render: (props) => (
      <CompleteWordQuiz
        word={props.adaptiveTask.word}
        onAnswer={props.onAnswer}
        progress={props.adaptiveProgress}
        stats={props.stats}
        aiMode={props.aiMode}
        soundEnabled={props.soundEnabled}
      />
    ),
  },
  {
    matches: ({ modeId }) => modeId === 'toefl-complete',
    render: (props) => (
      <ToeflCompleteTheWordQuiz
        {...toeflPracticeProps(props)}
        user={props.user}
      />
    ),
  },
  {
    matches: ({ modeId }) => modeId === 'toefl-build',
    render: (props) => (
      <ToeflBuildSentenceQuiz {...toeflPracticeProps(props)} />
    ),
  },
  {
    matches: ({ readingTaskType }) => Boolean(readingTaskType),
    render: (props) => (
      <ToeflReadingTaskQuiz
        {...toeflPracticeProps(props)}
        taskType={props.readingTaskType}
        existingWords={props.words}
        onSaveVocabularyWord={props.onSaveVocabularyWord}
        onExplainVocabularyWord={props.onExplainVocabularyWord}
      />
    ),
  },
  {
    matches: ({ modeId }) => modeId === 'toefl-reading-mock',
    render: (props) => (
      <ToeflReadingMockTest
        {...toeflPracticeProps(props)}
        existingWords={props.words}
        onSaveVocabularyWord={props.onSaveVocabularyWord}
        onExplainVocabularyWord={props.onExplainVocabularyWord}
      />
    ),
  },
  {
    matches: ({ writingTaskType }) => Boolean(writingTaskType),
    render: (props) => (
      <ToeflWritingTaskQuiz
        {...toeflPracticeProps(props)}
        taskType={props.writingTaskType}
      />
    ),
  },
  {
    matches: ({ modeId }) => modeId === 'toefl-writing-mock',
    render: (props) => (
      <ToeflWritingMockTest {...toeflPracticeProps(props)} />
    ),
  },
];

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
  onAcceptedAnswer,
}) {
  const modeId = selectedMode?.id;
  const readingTaskType = getReadingTaskType(modeId);
  const writingTaskType = getWritingTaskType(modeId);
  const rendererContext = {
    adaptiveMode,
    modeId,
    readingTaskType,
    writingTaskType,
  };
  const renderer = QUIZ_RENDERERS.find((candidate) => candidate.matches(rendererContext));

  return renderer
    ? renderer.render({
      adaptiveMode,
      adaptiveProgress,
      adaptiveTask,
      aiConfig,
      aiMode,
      currentIndex,
      onAcceptedAnswer,
      onAnswer,
      onAssetCreated,
      onAttemptRecorded,
      onExit,
      onExplainVocabularyWord,
      onSaveVocabularyWord,
      queue,
      readingTaskType,
      reviewAsset,
      soundEnabled,
      stats,
      toeflConfig,
      user,
      words,
      writingTaskType,
    })
    : null;
}
