const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E'];

const clampPercent = (value) => Math.max(0, Math.min(100, Math.round(value || 0)));

const toText = (value, fallback = '') => {
  if (value === null || value === undefined) return fallback;
  return String(value);
};

const isValidIndex = (value, options) => Number.isInteger(value) && value >= 0 && value < options.length;

const getResultKey = (result, index) => (
  result?.questionId ?? result?.itemId ?? result?.id ?? result?.questionIndex ?? index
);

const buildResultIndex = (results) => {
  const indexed = new Map();
  results.forEach((result, index) => {
    if (!result || typeof result !== 'object') return;
    indexed.set(String(getResultKey(result, index)), result);
    indexed.set(`index:${index}`, result);
  });
  return indexed;
};

const summarizeBreakdown = (reviews, key, fallbackLabel) => {
  const buckets = new Map();
  reviews.forEach((review) => {
    const rawValues = key === 'topicTags' ? review.topicTags : [review[key]];
    const values = rawValues?.length ? rawValues : [fallbackLabel];
    values.filter(Boolean).forEach((value) => {
      const label = toText(value, fallbackLabel);
      if (!buckets.has(label)) {
        buckets.set(label, { label, correct: 0, total: 0, accuracy: 0 });
      }
      const bucket = buckets.get(label);
      bucket.total += 1;
      if (review.correct) bucket.correct += 1;
    });
  });

  return Array.from(buckets.values())
    .map((bucket) => ({
      ...bucket,
      accuracy: bucket.total > 0 ? clampPercent((bucket.correct / bucket.total) * 100) : 0,
    }))
    .sort((a, b) => a.accuracy - b.accuracy || b.total - a.total || a.label.localeCompare(b.label));
};

const buildFeedback = ({ accuracy, wrongItems, skillBreakdown, targetScore }) => {
  const weakestSkill = skillBreakdown.find((bucket) => bucket.total > 0);
  const missedSkills = [...new Set(wrongItems.map((item) => item.skillTag).filter(Boolean))];
  const firstMiss = wrongItems[0];

  if (wrongItems.length === 0) {
    return {
      headline: `목표 TOEFL ${targetScore}+ 기준으로 근거 추적이 안정적입니다.`,
      detail: '모든 문항에서 선택지와 지문 근거를 잘 연결했습니다. 다음 세트에서는 풀이 속도를 유지하면서 inference와 rhetorical-purpose 문항의 근거 문장을 빠르게 표시하는 연습이 좋습니다.',
      nextSteps: [
        '정답 근거가 되는 문장을 지문 안에서 1개씩 표시하며 복습하세요.',
        '같은 난이도의 새 지문에서는 풀이 시간을 조금 줄여 정확도를 유지해보세요.',
      ],
    };
  }

  const focusSkill = weakestSkill?.label || missedSkills[0] || 'reading evidence';
  return {
    headline: `정답률 ${accuracy}%입니다. 우선 ${focusSkill} 유형의 근거 판별을 보강하세요.`,
    detail: firstMiss?.explanationKo
      ? `가장 먼저 볼 오답 근거: ${firstMiss.explanationKo}`
      : '오답 문항에서는 선택지가 지문보다 넓게 말하거나, 지문에 없는 정보를 끼워 넣는지 확인하는 것이 좋습니다.',
    nextSteps: [
      missedSkills.length > 0
        ? `${missedSkills.join(', ')} 문항의 정답 선택지를 지문 근거와 한 줄씩 연결하세요.`
        : '오답 문항의 정답 선택지를 지문 근거와 한 줄씩 연결하세요.',
      '내가 고른 선택지가 왜 너무 넓거나, 좁거나, unsupported인지 한 문장으로 적어보세요.',
    ],
  };
};

export const buildToeflReadingReport = ({
  items = [],
  results = [],
  correctCount,
  totalCount,
  targetScore,
  topicTags = [],
  score = {},
}) => {
  const resultIndex = buildResultIndex(results);
  const questionReviews = items.map((item, index) => {
    const itemId = item?.id ?? index;
    const result = resultIndex.get(String(itemId)) || resultIndex.get(`index:${index}`) || {};
    const options = Array.isArray(item?.options) ? item.options : [];
    const selectedIndex = Number.isInteger(result.selectedIndex) ? result.selectedIndex : null;
    const answerIndex = Number.isInteger(result.answerIndex)
      ? result.answerIndex
      : Number.isInteger(item?.answerIndex)
        ? item.answerIndex
        : 0;
    const correct = Boolean(result.correct ?? (selectedIndex !== null && selectedIndex === answerIndex));
    const selectedAnswer = isValidIndex(selectedIndex, options) ? options[selectedIndex] : '선택 없음';
    const correctAnswer = isValidIndex(answerIndex, options) ? options[answerIndex] : '정답 정보 없음';

    return {
      id: itemId,
      number: index + 1,
      taskType: item?.taskType,
      title: item?.title,
      prompt: toText(item?.prompt, `Question ${index + 1}`),
      skillTag: toText(item?.skillTag, 'general-reading'),
      topicTags: Array.isArray(item?.topicTags) && item.topicTags.length > 0 ? item.topicTags : topicTags,
      selectedIndex,
      selectedLabel: isValidIndex(selectedIndex, options) ? OPTION_LABELS[selectedIndex] : '',
      selectedAnswer,
      answerIndex,
      answerLabel: isValidIndex(answerIndex, options) ? OPTION_LABELS[answerIndex] : '',
      correctAnswer,
      correct,
      explanationKo: toText(item?.explanationKo || item?.explanation, '정답 근거를 다시 확인해보세요.'),
      stage: item?.stage,
    };
  });

  const total = totalCount ?? questionReviews.length;
  const correct = correctCount ?? questionReviews.filter((item) => item.correct).length;
  const wrongCount = Math.max(0, total - correct);
  const accuracy = total > 0 ? clampPercent((correct / total) * 100) : 0;
  const skillBreakdown = summarizeBreakdown(questionReviews, 'skillTag', 'general-reading');
  const topicBreakdown = summarizeBreakdown(questionReviews, 'topicTags', 'untagged')
    .filter((bucket) => bucket.label !== 'untagged');
  const wrongItems = questionReviews.filter((item) => !item.correct);

  return {
    metrics: {
      accuracy,
      correctCount: correct,
      wrongCount,
      totalCount: total,
      targetScore,
      score,
    },
    skillBreakdown,
    topicBreakdown,
    questionReviews,
    wrongItems,
    feedback: buildFeedback({ accuracy, wrongItems, skillBreakdown, targetScore }),
  };
};
