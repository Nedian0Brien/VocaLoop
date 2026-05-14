import { CheckCircle, Edit3, Brain, Sparkles, BookOpen, Target, Zap, Mail, Quote, FileText } from './Icons';

export const VOCABULARY_MODES = [
  {
    id: 'mixed',
    title: 'AI 복합 퀴즈',
    description: '객관식, 주관식, Complete word를 섞어 단어별 난이도를 단계적으로 올리고 오답은 다시 출제합니다.',
    icon: Brain,
    color: 'blue',
    recommended: true,
  },
  {
    id: 'multiple',
    title: '객관식 퀴즈',
    description: '4가지 뜻 중 올바른 정답을 선택하세요. 가장 빠르고 효과적인 학습 방식입니다.',
    icon: CheckCircle,
    color: 'blue',
  },
  {
    id: 'short',
    title: '주관식 퀴즈',
    description: '단어의 철자와 뜻을 직접 입력하여 암기 수준을 완벽하게 검증합니다.',
    icon: Edit3,
    color: 'purple',
  },
];

export const TOEFL_READING_MODES = [
  {
    id: 'toefl-reading-mock',
    title: 'TOEFL Reading Mock Test',
    description: 'Stage 1 결과에 따라 Stage 2 난이도가 갈리는 실전형 Reading 모의고사입니다.',
    icon: Target,
    color: 'purple',
    recommended: true,
  },
  {
    id: 'toefl-complete',
    title: 'Complete the Words',
    description: '2026 TOEFL Reading의 단어 완성 task에 맞춰 문맥 속 빠진 철자를 완성합니다.',
    icon: Sparkles,
    color: 'blue',
    recommended: true,
  },
  {
    id: 'toefl-daily-life',
    title: 'Read in Daily Life',
    description: '이메일, 공지, 일정표 등 실생활 텍스트에서 목적과 세부 정보를 빠르게 파악합니다.',
    icon: BookOpen,
    color: 'blue',
  },
  {
    id: 'toefl-academic-passage',
    title: 'Read an Academic Passage',
    description: '학술 지문을 읽고 중심 생각, 추론, 어휘 맥락, 수사적 관계를 풉니다.',
    icon: Zap,
    color: 'purple',
  },
];

export const TOEFL_WRITING_MODES = [
  {
    id: 'toefl-writing-mock',
    title: 'TOEFL Writing Mock Test',
    description: 'Build a Sentence 10문항, Email 1문항, Academic Discussion 1문항을 이어서 풉니다.',
    icon: FileText,
    color: 'purple',
    recommended: true,
  },
  {
    id: 'toefl-build',
    title: 'Build a Sentence',
    description: '주어진 토큰을 TOEFL 수준의 문법과 논리 흐름에 맞게 배열해 완성 문장을 만듭니다.',
    icon: Edit3,
    color: 'purple',
  },
  {
    id: 'toefl-writing-email',
    title: 'Write an Email',
    description: '상황과 요구사항을 반영해 공손하고 목적이 분명한 이메일을 작성합니다.',
    icon: Mail,
    color: 'blue',
  },
  {
    id: 'toefl-writing-discussion',
    title: 'Write for an Academic Discussion',
    description: '교수 질문과 학생 의견을 읽고 100단어 이상으로 학술 토론에 기여합니다.',
    icon: Quote,
    color: 'purple',
  },
];

export const TOEFL_MODES = [...TOEFL_READING_MODES, ...TOEFL_WRITING_MODES];
export const QUIZ_MODES = [...VOCABULARY_MODES, ...TOEFL_MODES];

export const QUIZ_MODE_BY_ID = Object.fromEntries(QUIZ_MODES.map((mode) => [mode.id, mode]));
export const TOEFL_MODE_TITLES = Object.fromEntries(TOEFL_MODES.map((mode) => [mode.id, mode.title]));

export const TOEFL_READING_LABELS = {
  'complete-words': TOEFL_MODE_TITLES['toefl-complete'],
  'daily-life': TOEFL_MODE_TITLES['toefl-daily-life'],
  'academic-passage': TOEFL_MODE_TITLES['toefl-academic-passage'],
  'toefl-complete': TOEFL_MODE_TITLES['toefl-complete'],
};

export const getReadingTaskType = (modeId) => {
  if (modeId === 'toefl-daily-life') return 'daily-life';
  if (modeId === 'toefl-academic-passage') return 'academic-passage';
  return null;
};

export const getWritingTaskType = (modeId) => {
  if (modeId === 'toefl-writing-email') return 'email';
  if (modeId === 'toefl-writing-discussion') return 'academic-discussion';
  return null;
};
