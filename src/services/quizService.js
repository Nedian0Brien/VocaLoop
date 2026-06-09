/**
 * 퀴즈 생성 서비스
 * 로컬 모드와 AI 모드를 지원합니다.
 */

import { callAiModel, hasAiProviderAccess, parseJsonOutput } from './aiModelService';

/**
 * 객관식 선택지 생성 (로컬 모드)
 * @param {Object} word - 정답 단어
 * @param {Array} allWords - 전체 단어 목록
 * @returns {Array} - 4개의 선택지 (정답 포함, 섞인 상태)
 */
function generateLocalMultipleChoice(word, allWords) {
  const correctAnswer = word.meaning_ko;
  const wrongOptions = [];

  // 다른 단어들에서 오답 선택
  const otherWords = allWords.filter(w => w.meaning_ko !== correctAnswer);

  // 최소 3개의 다른 단어가 필요
  if (otherWords.length < 3) {
    // 단어가 부족한 경우, 임시 오답 생성
    const fallbackOptions = [
      '다른 의미 1',
      '다른 의미 2',
      '다른 의미 3'
    ];
    wrongOptions.push(...fallbackOptions.slice(0, 3 - otherWords.length));

    // 남은 단어로 채우기
    otherWords.forEach(w => {
      if (wrongOptions.length < 3) {
        wrongOptions.push(w.meaning_ko);
      }
    });
  } else {
    // 랜덤하게 3개의 오답 선택
    const shuffled = [...otherWords].sort(() => Math.random() - 0.5);
    for (let i = 0; i < 3 && i < shuffled.length; i++) {
      wrongOptions.push(shuffled[i].meaning_ko);
    }
  }

  // 정답과 오답을 합쳐서 섞기
  const allOptions = [correctAnswer, ...wrongOptions];
  return allOptions.sort(() => Math.random() - 0.5);
}

/**
 * 객관식 선택지 생성 (AI 모드)
 * @param {Object} word - 정답 단어
 * @param {Object} aiConfig - AI 제공자/모델/키 설정
 * @returns {Promise<Array>} - 4개의 선택지 (정답 포함, 섞인 상태)
 */
async function generateAIMultipleChoice(word, aiConfig) {

  const prompt = `당신은 영어 단어 학습을 위한 객관식 문제 출제자입니다.

다음 영어 단어에 대한 4지선다 문제를 만들어주세요:
- 단어: ${word.word}
- 정답 (한글 뜻): ${word.meaning_ko}
- 품사: ${word.pos || ''}

지능형 오답(Distractor) 3개를 생성해주세요. 오답은 다음 조건을 만족해야 합니다:
1. 학습자가 실제로 혼동할 수 있는 비슷한 의미의 한글 단어
2. 철자나 발음이 비슷한 다른 영어 단어의 뜻
3. 같은 의미 범주에 속하지만 미묘하게 다른 의미

응답 형식:
{
  "correct": "정답 한글 뜻",
  "wrong": ["오답1", "오답2", "오답3"]
}`;

  try {
    const text = await callAiModel({
      ...aiConfig,
      prompt,
      jsonOutput: true
    });
    const data = parseJsonOutput(text);

    // 검증
    if (!data.correct || !Array.isArray(data.wrong) || data.wrong.length !== 3) {
      throw new Error('잘못된 응답 형식');
    }

    // 정답과 오답을 합쳐서 섞기
    const allOptions = [data.correct, ...data.wrong];
    return allOptions.sort(() => Math.random() - 0.5);
  } catch (error) {
    console.error('AI 문제 생성 실패:', error);
    throw error;
  }
}

/**
 * 객관식 선택지 생성 (메인 함수)
 * @param {Object} word - 정답 단어
 * @param {Array} allWords - 전체 단어 목록
 * @param {Boolean} useAI - AI 모드 사용 여부
 * @param {Object} aiConfig - AI 제공자/모델/키 (AI 모드 사용 시 필요)
 * @returns {Promise<Array>} - 4개의 선택지
 */
export async function generateMultipleChoiceOptions(word, allWords, useAI = false, aiConfig = null) {
  if (useAI && hasAiProviderAccess(aiConfig)) {
    try {
      return await generateAIMultipleChoice(word, aiConfig);
    } catch (error) {
      console.warn('AI 모드 실패, 로컬 모드로 폴백:', error);
      return generateLocalMultipleChoice(word, allWords);
    }
  }

  return generateLocalMultipleChoice(word, allWords);
}

const PARENTHETICAL_NOTE_REGEX = /\s*[\(（][^()（）]*[\)）]\s*/g;

function stripParentheticalNotes(value = '') {
  return String(value).replace(PARENTHETICAL_NOTE_REGEX, ' ').trim();
}

function normalizeAnswerText(value = '') {
  return String(value).trim().toLowerCase().replace(/\s+/g, ' ');
}

function getAnswerComparisonForms(value = '') {
  return Array.from(new Set([
    normalizeAnswerText(value),
    normalizeAnswerText(stripParentheticalNotes(value)),
  ].filter(Boolean)));
}

function splitAnswerItems(value = '') {
  return String(value)
    .split(/[,，]/)
    .map((candidate) => candidate.trim())
    .filter(Boolean);
}

function getMeaningCandidates(correctAnswer = '') {
  const fullAnswer = String(correctAnswer).trim();
  const candidates = splitAnswerItems(fullAnswer);

  return Array.from(new Set([fullAnswer, ...candidates].filter(Boolean)));
}

function getAcceptedAnswerCandidates(acceptedAnswers = [], mode = '') {
  if (!Array.isArray(acceptedAnswers)) return [];
  return acceptedAnswers
    .filter((item) => !mode || item?.mode === mode)
    .map((item) => String(item?.answer || '').trim())
    .filter(Boolean);
}

function compareShortAnswer(userAnswer, correctAnswer) {
  const userForms = getAnswerComparisonForms(userAnswer);
  const correctForms = getAnswerComparisonForms(correctAnswer);

  if (userForms.some((userForm) => correctForms.includes(userForm))) {
    return { similarity: 1.0, isCorrect: true, matchedAnswer: correctAnswer.trim() };
  }

  const bestSimilarity = userForms.reduce((best, userForm) => {
    const formBest = correctForms.reduce((max, correctForm) => {
      const distance = levenshteinDistance(userForm, correctForm);
      const maxLen = Math.max(userForm.length, correctForm.length);
      const similarity = maxLen === 0 ? 0 : 1 - (distance / maxLen);
      return Math.max(max, similarity);
    }, 0);
    return Math.max(best, formBest);
  }, 0);

  return {
    similarity: bestSimilarity,
    isCorrect: bestSimilarity >= 0.8,
    matchedAnswer: correctAnswer.trim(),
  };
}

/**
 * 주관식 답안 채점 (Levenshtein Distance)
 * @param {String} userAnswer - 사용자 답안
 * @param {String} correctAnswer - 정답
 * @returns {Object} - { similarity: 0-1, isCorrect: boolean }
 */
export function gradeShortAnswer(userAnswer, correctAnswer, options = {}) {
  const candidates = [
    ...getMeaningCandidates(correctAnswer),
    ...getAcceptedAnswerCandidates(options.acceptedAnswers, options.mode),
  ];
  const answersToCheck = candidates.length > 0 ? candidates : [correctAnswer];
  const fullAnswerResult = compareShortAnswer(userAnswer, correctAnswer);
  if (fullAnswerResult.isCorrect) {
    return {
      ...fullAnswerResult,
      isCorrect: true,
      matchedAnswers: [fullAnswerResult.matchedAnswer].filter(Boolean),
      unmatchedAnswers: [],
    };
  }

  const userAnswerItems = splitAnswerItems(userAnswer);
  const itemResults = userAnswerItems.map((answerItem) => {
    const resultsForItem = answersToCheck.map((answer) => compareShortAnswer(answerItem, answer));
    const bestForItem = resultsForItem.reduce((max, result) => (
      result.similarity > max.similarity ? result : max
    ), { similarity: 0, isCorrect: false, matchedAnswer: '' });

    return {
      answer: answerItem,
      ...bestForItem,
    };
  });
  const results = itemResults.length > 0
    ? itemResults
    : answersToCheck.map((answer) => compareShortAnswer(userAnswer, answer));
  const best = results.reduce((max, result) => (
    result.similarity > max.similarity ? result : max
  ), { similarity: 0, isCorrect: false, matchedAnswer: '' });
  const matchedAnswers = Array.from(new Set(
    itemResults
      .filter((result) => result.isCorrect && result.matchedAnswer)
      .map((result) => result.matchedAnswer)
  ));
  const unmatchedAnswers = itemResults
    .filter((result) => !result.isCorrect)
    .map((result) => result.answer);

  return matchedAnswers.length > 0
    ? {
      similarity: best.similarity,
      isCorrect: true,
      matchedAnswer: matchedAnswers[0],
      matchedAnswers,
      unmatchedAnswers,
    }
    : {
      similarity: best.similarity,
      isCorrect: false,
      matchedAnswer: best.matchedAnswer,
      matchedAnswers: [],
      unmatchedAnswers,
    };
}

/**
 * Levenshtein Distance 계산
 * @param {String} a - 문자열 1
 * @param {String} b - 문자열 2
 * @returns {Number} - 편집 거리
 */
function levenshteinDistance(a, b) {
  const matrix = [];

  // 초기화
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // 동적 프로그래밍
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // 치환
          matrix[i][j - 1] + 1,     // 삽입
          matrix[i - 1][j] + 1      // 삭제
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * AI 기반 의미론적 채점
 * @param {String} userAnswer - 사용자 답안
 * @param {String} correctAnswer - 정답
 * @param {Object} word - 단어 정보
 * @param {Object} aiConfig - AI 제공자/모델/키
 * @returns {Promise<Object>} - { isCorrect: boolean, feedback: string }
 */
export async function gradeWithAI(userAnswer, correctAnswer, word, aiConfig, options = {}) {
  const localResult = gradeShortAnswer(userAnswer, correctAnswer, options);
  if (localResult.isCorrect) {
    return {
      ...localResult,
      isCorrect: true,
      feedback: '정답입니다!',
    };
  }

  const prompt = `당신은 영어 단어 학습 채점 전문가입니다.

다음 영어 단어에 대한 학습자의 답안을 채점해주세요:
- 영어 단어: ${word.word}
- 정답: ${correctAnswer}
- 학습자 답안: ${userAnswer}

학습자의 답안이 의미상 정답과 일치하는지 판단해주세요.
- 정답이 쉼표(,)로 여러 뜻을 포함한다면, 그중 하나만 의미상 맞아도 정답입니다.
- 완전히 같은 의미: 정답
- 유사한 의미이지만 핵심이 다름: 오답
- 철자 오류가 있지만 의도는 명확함: 정답 (단, 오타 지적)
- 판단 결과에는 반드시 이유를 포함해주세요.

응답 형식:
{
  "isCorrect": true 또는 false,
  "reason": "판단 이유 (1-2문장)"
}`;

  try {
    const text = await callAiModel({
      ...aiConfig,
      prompt,
      jsonOutput: true
    });
    const data = parseJsonOutput(text);
    const feedback = data.reason || data.feedback || (
      data.isCorrect === true
        ? 'AI가 답안과 정답의 의미가 같다고 판단했습니다.'
        : 'AI가 답안과 정답의 핵심 의미가 다르다고 판단했습니다.'
    );

    return {
      isCorrect: data.isCorrect === true,
      feedback,
      matchedAnswers: [],
      unmatchedAnswers: data.isCorrect === true ? [] : localResult.unmatchedAnswers || [],
    };
  } catch (error) {
    console.error('AI 채점 실패:', error);
    throw error;
  }
}
