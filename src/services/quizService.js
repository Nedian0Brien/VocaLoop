/**
 * 퀴즈 생성 서비스
 * 로컬 모드와 AI 모드를 지원합니다.
 */

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
 * @param {String} apiKey - Gemini API 키
 * @returns {Promise<Array>} - 4개의 선택지 (정답 포함, 섞인 상태)
 */
async function generateAIMultipleChoice(word, apiKey) {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  const prompt = `당신은 영어 단어 학습을 위한 객관식 문제 출제자입니다.

다음 영어 단어에 대한 4지선다 문제를 만들어주세요:
- 단어: ${word.word}
- 정답 (한글 뜻): ${word.meaning_ko}
- 품사: ${word.pos || ''}

지능형 오답(Distractor) 3개를 생성해주세요. 오답은 다음 조건을 만족해야 합니다:
1. 학습자가 실제로 혼동할 수 있는 비슷한 의미의 한글 단어
2. 철자나 발음이 비슷한 다른 영어 단어의 뜻
3. 같은 의미 범주에 속하지만 미묘하게 다른 의미

**중요: JSON 형식으로만 응답해주세요. 다른 설명은 포함하지 마세요.**

응답 형식:
{
  "correct": "정답 한글 뜻",
  "wrong": ["오답1", "오답2", "오답3"]
}`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // JSON 추출
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('JSON 형식이 아닙니다');
    }

    const data = JSON.parse(jsonMatch[0]);

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
 * @param {String} apiKey - Gemini API 키 (AI 모드 사용 시 필요)
 * @returns {Promise<Array>} - 4개의 선택지
 */
export async function generateMultipleChoiceOptions(word, allWords, useAI = false, apiKey = null) {
  if (useAI && apiKey) {
    try {
      return await generateAIMultipleChoice(word, apiKey);
    } catch (error) {
      console.warn('AI 모드 실패, 로컬 모드로 폴백:', error);
      return generateLocalMultipleChoice(word, allWords);
    }
  }

  return generateLocalMultipleChoice(word, allWords);
}

/**
 * 주관식 답안 채점 (Levenshtein Distance)
 * @param {String} userAnswer - 사용자 답안
 * @param {String} correctAnswer - 정답
 * @returns {Object} - { similarity: 0-1, isCorrect: boolean }
 */
export function gradeShortAnswer(userAnswer, correctAnswer) {
  // 공백 제거 및 소문자 변환
  const user = userAnswer.trim().toLowerCase();
  const correct = correctAnswer.trim().toLowerCase();

  // 완전 일치
  if (user === correct) {
    return { similarity: 1.0, isCorrect: true };
  }

  // Levenshtein Distance 계산
  const distance = levenshteinDistance(user, correct);
  const maxLen = Math.max(user.length, correct.length);
  const similarity = 1 - (distance / maxLen);

  // 80% 이상 유사하면 정답으로 인정
  const isCorrect = similarity >= 0.8;

  return { similarity, isCorrect };
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
 * @param {String} apiKey - Gemini API 키
 * @returns {Promise<Object>} - { isCorrect: boolean, feedback: string }
 */
export async function gradeWithAI(userAnswer, correctAnswer, word, apiKey) {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  const prompt = `당신은 영어 단어 학습 채점 전문가입니다.

다음 영어 단어에 대한 학습자의 답안을 채점해주세요:
- 영어 단어: ${word.word}
- 정답: ${correctAnswer}
- 학습자 답안: ${userAnswer}

학습자의 답안이 의미상 정답과 일치하는지 판단해주세요.
- 완전히 같은 의미: 정답
- 유사한 의미이지만 핵심이 다름: 오답
- 철자 오류가 있지만 의도는 명확함: 정답 (단, 오타 지적)

**중요: JSON 형식으로만 응답해주세요.**

응답 형식:
{
  "isCorrect": true 또는 false,
  "feedback": "간단한 피드백 (1-2문장)"
}`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // JSON 추출
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('JSON 형식이 아닙니다');
    }

    const data = JSON.parse(jsonMatch[0]);

    return {
      isCorrect: data.isCorrect === true,
      feedback: data.feedback || ''
    };
  } catch (error) {
    console.error('AI 채점 실패:', error);
    throw error;
  }
}
