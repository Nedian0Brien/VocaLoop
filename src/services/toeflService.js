import { callAiModel, parseJsonOutput } from './aiModelService';

const requestAiJson = async (prompt, aiConfig) => {
  const text = await callAiModel({ ...aiConfig, prompt, jsonOutput: true });
  return parseJsonOutput(text);
};

export const generateCompleteTheWordSet = async ({
  aiConfig,
  questionCount,
  blanksPerQuestion,
  targetScore
}) => {
  const prompt = `
You are creating a TOEFL academic reading practice set for a learner targeting ${targetScore}+.
Create ${questionCount} questions. Each question must include:
1) An academic paragraph (120-160 words) with ${blanksPerQuestion} COMPLETE WORDS replaced with placeholders.
2) The paragraph should use TOEFL-like academic tone and topics.
3) Replace ENTIRE WORDS (not partial letters) with placeholders like {{1}}, {{2}}, ... {{${blanksPerQuestion}}} in order of appearance.
4) Choose words that are 4-10 letters long for the blanks.
5) Provide the full original paragraph (without blanks).
6) Provide a blanks array with id and the correct COMPLETE WORD as the answer.

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
