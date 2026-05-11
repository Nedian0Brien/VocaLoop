import { callAiModel, parseJsonOutput } from './aiModelService';

const requestAiJson = async (prompt, aiConfig) => {
  const text = await callAiModel({ ...aiConfig, prompt, jsonOutput: true });
  return parseJsonOutput(text);
};

/**
 * 출력 다양성을 위한 nonce 생성. 동일한 옵션 조합에서도 LLM 응답이 비슷해지는 현상을 완화.
 */
const buildRandomNonce = () => {
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `${stamp}-${rand}`;
};

/**
 * 사용자가 수집한 단어를 프롬프트에 통합. 학습 단어 우선 활용을 LLM 에 강제.
 *
 * @param {Array<{word: string, meaning_ko?: string, pos?: string}>} vocabularyWords
 */
const formatVocabularyWordsBlock = (vocabularyWords) => {
  if (!Array.isArray(vocabularyWords) || vocabularyWords.length === 0) return '';
  const lines = vocabularyWords
    .filter((w) => w && typeof w.word === 'string' && w.word.trim().length > 0)
    .slice(0, 40) // 안전 상한 — 토큰 폭주 방지
    .map((w) => {
      const meaning = w.meaning_ko ? ` (한글 뜻: ${w.meaning_ko})` : '';
      const pos = w.pos ? ` [${w.pos}]` : '';
      return `- ${w.word}${pos}${meaning}`;
    });
  if (lines.length === 0) return '';
  return `
LEARNER VOCABULARY (use as many of these as possible — they are the priority for this practice set):
${lines.join('\n')}
`;
};

/**
 * 선택된 분야 list 를 프롬프트에 포함.
 *
 * @param {{label: string, description?: string}[]} pickedTopics
 */
const formatTopicsBlock = (pickedTopics) => {
  if (!Array.isArray(pickedTopics) || pickedTopics.length === 0) return '';
  const lines = pickedTopics
    .filter((t) => t && typeof t.label === 'string' && t.label.trim())
    .map((t) => `- ${t.label}${t.description ? ` — ${t.description}` : ''}`);
  if (lines.length === 0) return '';
  return `
TOPIC FOCUS (write the passage so it clearly belongs to one or more of these academic fields):
${lines.join('\n')}
`;
};

const READING_TASK_SPECS = {
  'daily-life': {
    label: 'Read in Daily Life',
    stimulus: 'a realistic daily-life text such as a notice, email, schedule, menu, campus announcement, or short post',
    questionTypes: 'purpose, scanning for details, inference, and practical interpretation',
    length: '80-140 words',
  },
  'academic-passage': {
    label: 'Read an Academic Passage',
    stimulus: 'a TOEFL-style academic passage',
    questionTypes: 'main idea, detail, inference, vocabulary-in-context, rhetorical purpose, and idea relationship',
    length: '140-220 words',
  },
};

const MOCK_TASK_MIX = [
  {
    taskType: 'complete-words',
    label: 'Complete the Words',
    instruction: 'A short context with one missing TOEFL-level word. Ask the learner to choose the complete word that best fits.',
    skillTag: 'spelling-form',
  },
  {
    taskType: 'daily-life',
    label: 'Read in Daily Life',
    instruction: 'A realistic daily-life text such as a notice, email, schedule, menu, campus announcement, or short post.',
    skillTag: 'scanning',
  },
  {
    taskType: 'academic-passage',
    label: 'Read an Academic Passage',
    instruction: 'A TOEFL-style academic passage that supports main idea, inference, vocabulary, and rhetorical questions.',
    skillTag: 'main-idea',
  },
];

export const routeReadingMockDifficulty = ({ correct, total }) => {
  if (!total) return 'lower';
  return correct / total >= 0.7 ? 'upper' : 'lower';
};

export const estimateReadingBand = ({ correct, total, difficulty }) => {
  if (!total) return 1;
  const accuracy = correct / total;
  let band = 1;
  if (accuracy >= 0.9) band = 6;
  else if (accuracy >= 0.75) band = 5;
  else if (accuracy >= 0.6) band = 4;
  else if (accuracy >= 0.4) band = 3;
  else if (accuracy >= 0.2) band = 2;
  if (difficulty === 'lower') return Math.min(band, 4);
  return band;
};

export const generateCompleteTheWordSet = async ({
  aiConfig,
  questionCount,
  blanksPerQuestion,
  targetScore,
  vocabularyWords = [],
  pickedTopics = [],
}) => {
  const vocabBlock = formatVocabularyWordsBlock(vocabularyWords);
  const topicBlock = formatTopicsBlock(pickedTopics);
  const nonce = buildRandomNonce();

  const prompt = `
You are creating a TOEFL academic reading practice set for a learner targeting ${targetScore}+.
Create ${questionCount} questions. Each question must include:
1) An academic paragraph (120-160 words) with ${blanksPerQuestion} COMPLETE WORDS replaced with placeholders.
2) The paragraph should use TOEFL-like academic tone and topics.
3) Replace ENTIRE WORDS (not partial letters) with placeholders like {{1}}, {{2}}, ... {{${blanksPerQuestion}}} in order of appearance.
4) Choose words that are 4-10 letters long for the blanks.
5) Provide the full original paragraph (without blanks).
6) Provide a blanks array with id and the correct COMPLETE WORD as the answer.
${vocabBlock}${topicBlock}
DIVERSITY REQUIREMENTS (CRITICAL — different from previous sessions):
- Vary sentence openings, syntactic patterns, and rhetorical structures.
- Vary specific examples, named entities, regions, and time periods across questions.
- Avoid reusing the same anchor verbs/adverbs across questions in this set.
- Diversification token (do not output): ${nonce}

IMPORTANT: Replace the ENTIRE word, not just part of it.
Example CORRECT: "The {{1}} of knowledge is essential." (answer: "transfer")
Example WRONG: "The trans{{1}} of knowledge is essential." (answer: "fer")

Return ONLY valid JSON in this schema:
{
  "questions": [
    {
      "paragraph": "Text with {{1}} placeholders for complete words",
      "fullParagraph": "Complete paragraph with all words",
      "blanks": [
        { "id": 1, "answer": "transfer" }
      ]
    }
  ]
}
`;
  return requestAiJson(prompt, aiConfig);
};

export const generateCompleteTheWordFeedback = async ({
  aiConfig,
  question,
  userAnswers
}) => {
  const prompt = `
You are an English tutor providing concise feedback in Korean.
Question paragraph: ${question.fullParagraph}
Correct answers (id:letters): ${question.blanks.map((blank) => `${blank.id}:${blank.answer}`).join(', ')}
User answers (id:letters): ${userAnswers.map((answer, index) => `${question.blanks[index].id}:${answer}`).join(', ')}

Return JSON only:
{
  "feedback": "Korean feedback with why mistakes happened and tips."
}
`;
  return requestAiJson(prompt, aiConfig);
};

export const generateCompleteTheWordSummary = async ({
  aiConfig,
  targetScore,
  results
}) => {
  const prompt = `
You are an English tutor. Provide a concise TOEFL study report in Korean for a learner targeting ${targetScore}+.
Results summary: ${results}

Return JSON only:
{
  "summary": "Overall summary",
  "strengths": ["strength1", "strength2"],
  "improvements": ["improvement1", "improvement2"],
  "nextSteps": ["nextStep1", "nextStep2"]
}
`;
  return requestAiJson(prompt, aiConfig);
};

/**
 * Build-a-Sentence — 단어 카드를 올바른 순서로 배열하여 문장을 구성하는 퀴즈.
 */
export const generateBuildSentenceSet = async ({
  aiConfig,
  questionCount,
  targetScore,
  vocabularyWords = [],
  pickedTopics = [],
}) => {
  const vocabBlock = formatVocabularyWordsBlock(vocabularyWords);
  const topicBlock = formatTopicsBlock(pickedTopics);
  const nonce = buildRandomNonce();

  const prompt = `
You are creating a TOEFL "Build-a-Sentence" practice set for a learner targeting ${targetScore}+.
Generate ${questionCount} sentence-reconstruction questions.

For each question:
1) "target": a complete academic sentence (10-20 words) using TOEFL-level vocabulary and structure.
2) "words": array containing ALL words from the target sentence in SCRAMBLED order. Include punctuation as separate tokens only when necessary; otherwise omit punctuation. Optionally add 1-2 plausible distractor words to make the task harder, but keep it solvable.
3) "hint": one-sentence Korean translation/paraphrase of the target.
4) Topics may include science, history, social science, humanities — TOEFL-style.
${vocabBlock}${topicBlock}
DIVERSITY REQUIREMENTS (CRITICAL — different from previous sessions):
- Use a mix of sentence structures (cause/effect, contrast, sequence, comparison, definition).
- Avoid recycling the same subjects ("Researchers", "Scientists") across all sentences.
- Vary verbs and avoid the most predictable academic collocations within a single set.
- Diversification token (do not output): ${nonce}

Return ONLY valid JSON:
{
  "questions": [
    {
      "target": "Researchers concluded that climate change significantly accelerates species migration patterns.",
      "words": ["that", "Researchers", "migration", "species", "significantly", "accelerates", "concluded", "patterns", "change", "climate"],
      "hint": "연구원들은 기후 변화가 종의 이동 패턴을 크게 가속화한다고 결론지었다."
    }
  ]
}
`;
  return requestAiJson(prompt, aiConfig);
};

export const generateBuildSentenceFeedback = async ({
  aiConfig,
  target,
  userAttempt,
}) => {
  const prompt = `
You are a TOEFL English tutor giving concise Korean feedback.
Target sentence: "${target}"
User's attempt: "${userAttempt}"

Decide if the attempt:
- exactly matches the target, OR
- is grammatically valid AND semantically equivalent to the target.

Return JSON only:
{
  "isCorrect": true,
  "feedback": "Korean explanation. If incorrect, point out the specific issue (어순/문법/단어 누락 등) and how to fix it."
}
`;
  return requestAiJson(prompt, aiConfig);
};

export const generateBuildSentenceSummary = async ({
  aiConfig,
  targetScore,
  results,
}) => {
  const prompt = `
You are a TOEFL English tutor. Provide a concise study report in Korean for a Build-a-Sentence session aiming TOEFL ${targetScore}+.
Results summary: ${results}

Return JSON only:
{
  "summary": "Overall feedback (Korean)",
  "strengths": ["strength1", "strength2"],
  "improvements": ["improvement1", "improvement2"],
  "nextSteps": ["nextStep1", "nextStep2"]
}
`;
  return requestAiJson(prompt, aiConfig);
};

export const generateReadingTaskSet = async ({
  aiConfig,
  taskType,
  questionCount,
  targetScore,
  vocabularyWords = [],
  pickedTopics = [],
}) => {
  const spec = READING_TASK_SPECS[taskType];
  if (!spec) throw new Error(`Unsupported TOEFL Reading task: ${taskType}`);

  const vocabBlock = formatVocabularyWordsBlock(vocabularyWords);
  const topicBlock = formatTopicsBlock(pickedTopics);
  const nonce = buildRandomNonce();

  const prompt = `
You are creating practice for the 2026 TOEFL iBT Reading task "${spec.label}".
Learner target: TOEFL ${targetScore}+.

Create one ${spec.stimulus} (${spec.length}) and ${questionCount} multiple-choice questions.
Question types to cover: ${spec.questionTypes}.
${vocabBlock}${topicBlock}
PERSONALIZATION:
- If learner vocabulary is provided, weave several words naturally into the text or answer explanations.
- Keep the text realistic and readable; do not mention that it was generated.

DIVERSITY REQUIREMENTS:
- Vary names, settings, disciplines, and rhetorical patterns across sessions.
- Diversification token (do not output): ${nonce}

Return ONLY valid JSON:
{
  "taskType": "${taskType}",
  "title": "Short title",
  "stimulusLabel": "Notice | Email | Schedule | Academic passage | etc.",
  "stimulus": "The full reading text.",
  "topicTags": ["topic-or-domain"],
  "questions": [
    {
      "id": 1,
      "prompt": "Question stem",
      "options": ["A", "B", "C", "D"],
      "answerIndex": 0,
      "skillTag": "scanning | detail | main-idea | inference | vocabulary-context | rhetorical-structure | practical-interpretation",
      "explanationKo": "Korean explanation of why the answer is correct.",
      "saveableWords": ["optional", "words"]
    }
  ]
}
`;

  return requestAiJson(prompt, aiConfig);
};

export const generateReadingMockModule = async ({
  aiConfig,
  stage,
  difficulty,
  questionCount,
  targetScore,
  vocabularyWords = [],
  pickedTopics = [],
}) => {
  const vocabBlock = formatVocabularyWordsBlock(vocabularyWords);
  const topicBlock = formatTopicsBlock(pickedTopics);
  const nonce = buildRandomNonce();
  const moduleLabel =
    stage === 1
      ? 'Stage 1 Router'
      : difficulty === 'upper'
        ? 'Stage 2 Upper Module'
        : 'Stage 2 Lower Module';

  const prompt = `
You are creating a reduced 2026 TOEFL iBT Reading mock-test module.
Stage: ${stage}
Adaptive difficulty: ${difficulty}
Learner target: TOEFL ${targetScore}+.

Create ${questionCount} multiple-choice items across these task types:
${MOCK_TASK_MIX.map((task) => `- ${task.label}: ${task.instruction}`).join('\n')}
${vocabBlock}${topicBlock}

Rules:
- Mix task types as evenly as possible.
- Stage 1 should calibrate ability with medium difficulty.
- Stage 2 upper should use denser language and harder inference/rhetoric.
- Stage 2 lower should be clearer but still TOEFL-like.
- Each item must be answerable from its own stimulus.
- Diversification token (do not output): ${nonce}

Return ONLY valid JSON:
{
  "stage": ${stage},
  "difficulty": "${difficulty}",
  "label": "${moduleLabel}",
  "items": [
    {
      "id": "s${stage}-1",
      "taskType": "complete-words | daily-life | academic-passage",
      "title": "Short title",
      "stimulusLabel": "Complete the Words | Email | Notice | Academic passage | etc.",
      "stimulus": "Reading text or context.",
      "prompt": "Question stem",
      "options": ["A", "B", "C", "D"],
      "answerIndex": 0,
      "skillTag": "spelling-form | scanning | detail | main-idea | inference | vocabulary-context | rhetorical-structure | practical-interpretation",
      "topicTags": ["topic-or-domain"],
      "explanationKo": "Korean explanation of the answer."
    }
  ]
}
`;

  return requestAiJson(prompt, aiConfig);
};
