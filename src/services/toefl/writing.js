import {
  buildRandomNonce,
  clampScore,
  formatTopicsBlock,
  formatVocabularyWordsBlock,
  requestAiJson,
} from './promptUtils';

const WRITING_TASK_SPECS = {
  email: {
    label: 'Write an Email',
    timeLimitMinutes: 7,
    purpose:
      'a practical email for requesting information, making a recommendation, explaining a problem, or arranging a plan',
    responseTarget: 'a clear email that fully addresses every bullet point in the situation',
  },
  'academic-discussion': {
    label: 'Write for an Academic Discussion',
    timeLimitMinutes: 10,
    purpose:
      'an online class discussion where the learner contributes an opinion after reading a professor prompt and two student posts',
    responseTarget: 'at least 100 words with a clear opinion, support, and a connection to the discussion',
  },
};

export const estimateWritingBand = ({
  sentenceCorrect,
  sentenceTotal,
  emailScore,
  discussionScore,
}) => {
  const sentenceRatio = sentenceTotal > 0 ? sentenceCorrect / sentenceTotal : 0;
  const emailRatio = clampScore(emailScore, 0, 5) / 5;
  const discussionRatio = clampScore(discussionScore, 0, 5) / 5;
  const weighted = (sentenceRatio * 0.4) + (emailRatio * 0.3) + (discussionRatio * 0.3);

  if (weighted >= 0.88) return 6;
  if (weighted >= 0.72) return 5;
  if (weighted >= 0.52) return 4;
  if (weighted >= 0.34) return 3;
  if (weighted >= 0.16) return 2;
  return 1;
};

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
You are creating an ETS-style Build a Sentence practice set for a learner targeting TOEFL ${targetScore}+.
Generate exactly ${questionCount} sentence-reconstruction questions.

For each question:
1) "context": one short English setup sentence or question that gives a realistic situation.
2) "sentenceFrame": the sentence/question to complete, with each missing word or phrase represented by "_____". Keep any fixed words and punctuation in the frame.
3) "target": the complete correct sentence or question after the blanks are filled.
4) "words": scrambled array containing every answer token as words or phrases. Optionally add 0-2 plausible distractors, but keep the item solvable.
5) "answer": array of the exact tokens that fill the blanks in order. Its length must match the number of "_____" blanks in sentenceFrame.
${vocabBlock}${topicBlock}

AUTHENTICITY REQUIREMENTS:
- Use English context only. Do not provide Korean translations, Korean paraphrases, or Korean hint text.
- Most items should be everyday campus, work, travel, or social situations; use academic settings only occasionally.
- Include questions and short responses, not only declarative sentences.
- Use words or phrases as movable tokens, such as "any books", "to be", "very engaging", or "the last chapter".
- Keep targets concise: usually 5-12 words, with 3-7 movable tokens.
- Avoid advanced academic vocabulary unless the context naturally requires it.
- Incorrect distractors should create common word-order or grammar traps.
- Do not ask for opinions or explanations in Build a Sentence.
- Do not create standalone long academic sentences with all words scrambled.
- Do not provide Korean translations.
- Diversify sentence patterns across the set.
- Diversification token (do not output): ${nonce}

Return ONLY valid JSON:
{
  "questions": [
    {
      "id": 1,
      "context": "I'm planning a trip to Europe this summer.",
      "sentenceFrame": "_____ _____ book your _____ _____ ?",
      "target": "Did you book your flight yet?",
      "words": ["flight", "Did", "already", "yet", "you"],
      "answer": ["Did", "you", "flight", "yet"]
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
- uses the same required tokens in the same order as the target.
- Ignore only capitalization, extra spaces, and spacing before punctuation.
- Do not accept semantic paraphrases, substituted words, missing fixed words, reordered tokens, or extra distractors.

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

export const generateWritingTask = async ({
  aiConfig,
  taskType,
  targetScore,
  vocabularyWords = [],
  pickedTopics = [],
}) => {
  const spec = WRITING_TASK_SPECS[taskType];
  if (!spec) throw new Error(`Unsupported TOEFL Writing task: ${taskType}`);

  const vocabBlock = formatVocabularyWordsBlock(vocabularyWords);
  const topicBlock = formatTopicsBlock(pickedTopics);
  const nonce = buildRandomNonce();

  const prompt = `
You are creating a 2026 TOEFL iBT Writing practice task: "${spec.label}".
Learner target: TOEFL ${targetScore}+.

Task purpose: ${spec.purpose}.
Expected response: ${spec.responseTarget}.
Time limit: ${spec.timeLimitMinutes} minutes.
${vocabBlock}${topicBlock}
DIVERSITY REQUIREMENTS:
- Use realistic contexts and varied academic/campus/professional situations.
- Avoid generic prompts about technology, climate, or education unless topic focus requires them.
- Diversification token (do not output): ${nonce}

Return ONLY valid JSON.
For taskType "email", use this schema:
{
  "taskType": "email",
  "title": "Short task title",
  "situation": "A concise realistic situation paragraph.",
  "requirements": ["bullet requirement 1", "bullet requirement 2", "bullet requirement 3"],
  "recipient": "recipient role or name",
  "timeLimitMinutes": 7,
  "wordTarget": "No fixed word count; answer completely and politely."
}

For taskType "academic-discussion", use this schema:
{
  "taskType": "academic-discussion",
  "title": "Short discussion title",
  "course": "Course or field name",
  "professorQuestion": "Professor prompt asking for the learner's contribution.",
  "studentPosts": [
    { "name": "Mina", "text": "Student opinion with a reason." },
    { "name": "Daniel", "text": "Different student opinion with a reason." }
  ],
  "timeLimitMinutes": 10,
  "wordTarget": "Write at least 100 words."
}
`;

  return requestAiJson(prompt, aiConfig);
};

export const evaluateWritingResponse = async ({
  aiConfig,
  taskType,
  task,
  userResponse,
  targetScore,
}) => {
  const spec = WRITING_TASK_SPECS[taskType];
  if (!spec) throw new Error(`Unsupported TOEFL Writing task: ${taskType}`);

  const prompt = `
You are a TOEFL Writing rater and Korean tutor.
Task type: ${spec.label}
Learner target: TOEFL ${targetScore}+.
Task JSON:
${JSON.stringify(task)}

Learner response:
${userResponse}

Score the response on a 0-5 practice rubric:
- 5: fully addresses the task, well organized, strong grammar and vocabulary
- 4: clear and mostly complete, minor language issues
- 3: adequate but limited development or noticeable language issues
- 2: partially addresses the task, weak organization or frequent errors
- 1: very limited
- 0: blank, unrelated, or not in English

Return ONLY valid JSON:
{
  "score": 0,
  "feedbackKo": "Concise Korean feedback.",
  "strengths": ["strength1", "strength2"],
  "improvements": ["improvement1", "improvement2"],
  "nextSteps": ["next step1", "next step2"]
}
`;

  return requestAiJson(prompt, aiConfig);
};

export const generateWritingMockSection = async ({
  aiConfig,
  targetScore,
  sentenceCount = 10,
  vocabularyWords = [],
  pickedTopics = [],
}) => {
  const vocabBlock = formatVocabularyWordsBlock(vocabularyWords);
  const topicBlock = formatTopicsBlock(pickedTopics);
  const nonce = buildRandomNonce();

  const prompt = `
You are creating a reduced 2026 TOEFL iBT Writing mock test.
Learner target: TOEFL ${targetScore}+.

Create:
1) ${sentenceCount} Build a Sentence items.
2) One Write an Email task.
3) One Write for an Academic Discussion task.
${vocabBlock}${topicBlock}

Build a Sentence rules:
- Use the same ETS-style Build a Sentence schema as standalone practice.
- Each item needs "context", "sentenceFrame", "target", "words", and "answer".
- Use English context only. Do not provide Korean translations.
- Most items should be everyday campus, work, travel, or social situations.
- Include questions and short responses, not only declarative sentences.
- "words" must contain all answer tokens in scrambled order and may include 0-2 plausible distractors.
- "answer" must list the exact tokens that fill the blanks in order.
- Keep targets concise: usually 5-12 words, with 3-7 movable tokens.

Writing task rules:
- Email task should be practical and answerable in 7 minutes.
- Academic discussion task should include professor prompt and two student posts, answerable in 10 minutes.
- Diversification token (do not output): ${nonce}

Return ONLY valid JSON:
{
  "sentenceItems": [
    {
      "id": 1,
      "context": "I'm going to study at the library this afternoon.",
      "sentenceFrame": "_____ _____ _____ _____ _____ _____ ?",
      "target": "Do you need to borrow any books?",
      "words": ["to", "do", "borrow", "any books", "you", "need"],
      "answer": ["Do", "you", "need", "to", "borrow", "any books"]
    }
  ],
  "emailTask": {
    "taskType": "email",
    "title": "Short task title",
    "situation": "A concise realistic situation paragraph.",
    "requirements": ["bullet requirement 1", "bullet requirement 2", "bullet requirement 3"],
    "recipient": "recipient role or name",
    "timeLimitMinutes": 7,
    "wordTarget": "No fixed word count; answer completely and politely."
  },
  "discussionTask": {
    "taskType": "academic-discussion",
    "title": "Short discussion title",
    "course": "Course or field name",
    "professorQuestion": "Professor prompt asking for the learner's contribution.",
    "studentPosts": [
      { "name": "Mina", "text": "Student opinion with a reason." },
      { "name": "Daniel", "text": "Different student opinion with a reason." }
    ],
    "timeLimitMinutes": 10,
    "wordTarget": "Write at least 100 words."
  }
}
`;

  return requestAiJson(prompt, aiConfig);
};

export const evaluateWritingMockSection = async ({
  aiConfig,
  emailTask,
  discussionTask,
  emailResponse,
  discussionResponse,
  sentenceCorrect,
  sentenceTotal,
  targetScore,
}) => {
  const prompt = `
You are a TOEFL Writing rater and Korean tutor.
Learner target: TOEFL ${targetScore}+.
Build a Sentence result: ${sentenceCorrect}/${sentenceTotal} correct.

Email task:
${JSON.stringify(emailTask)}
Email response:
${emailResponse}

Academic discussion task:
${JSON.stringify(discussionTask)}
Discussion response:
${discussionResponse}

Score emailScore and discussionScore from 0-5 using TOEFL-style practice criteria: task fulfillment, organization, development, language control.
Return ONLY valid JSON:
{
  "emailScore": 0,
  "discussionScore": 0,
  "feedbackKo": "Overall Korean feedback.",
  "strengths": ["strength1", "strength2"],
  "improvements": ["improvement1", "improvement2"],
  "nextSteps": ["next step1", "next step2"]
}
`;

  return requestAiJson(prompt, aiConfig);
};
