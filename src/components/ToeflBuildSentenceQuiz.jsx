import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, X, Check } from './Icons';
import {
  generateBuildSentenceSet,
  generateBuildSentenceFeedback,
  generateBuildSentenceSummary,
} from '../services/toeflService';
import { playSound } from '../utils/soundEffects';
import { sampleWords, pickRandomTopics } from '../utils/topicSets';
import { Button } from '../design-system';

/**
 * 드래그 인서션 placeholder — flexbox + width 트랜지션으로 옆 단어를 부드럽게 밀어냄.
 *
 * 드래그 중에는 모든 placeholder가 동일한 height를 유지(레이아웃 점프 방지),
 * dropAtIdx에 해당하는 한 곳만 width 가 0 → drag.width 로 transition.
 * 활성 슬롯의 점선/배경으로 사용자에게 인서션 위치를 시각화.
 */
const DropPlaceholder = ({ active, drag }) => {
  // drag 가 없을 땐 폭/높이 모두 0 — 레이아웃에 영향 없음.
  // drag 가 있을 땐 항상 같은 height를 유지해서 가로 width transition만 부드럽게 보이도록.
  const width = active && drag ? drag.width : 0;
  const height = drag ? drag.height : 0;
  return (
    <span
      aria-hidden="true"
      className="inline-block shrink-0"
      style={{
        width,
        height,
        overflow: 'hidden',
        // width 와 시각 효과만 transition — height 는 드래그 시작 시 1회 jump (transition 없음)
        transition: 'width 260ms cubic-bezier(0.16, 1, 0.3, 1), background-color 220ms ease-out, outline-color 220ms ease-out',
        outline: '2px dashed transparent',
        outlineColor: active ? 'var(--color-brand-400)' : 'transparent',
        outlineOffset: '-2px',
        borderRadius: '6px',
        backgroundColor: active ? 'rgb(59 130 246 / 0.12)' : 'transparent',
      }}
    />
  );
};

/**
 * TOEFL Build a Sentence — 단어 토큰을 올바른 순서로 배열해 문장을 완성.
 *
 * UX
 *  - 문제마다 한국어 힌트(목표 문장 번역) 제공
 *  - 단어 은행에서 클릭하면 답안 영역으로 이동, 답안 단어 클릭하면 은행으로 복귀
 *  - 정답 확인은 AI 채점(`generateBuildSentenceFeedback`) 사용 — 정확/의미동등 모두 정답 처리
 *  - 마지막 문항 후 종합 리포트 (`generateBuildSentenceSummary`)
 */
export default function ToeflBuildSentenceQuiz({
  aiConfig,
  questionCount,
  targetScore,
  vocabSource,
  topicSelection,
  onExit,
  reviewAsset = null,
  onAssetCreated,
  onAttemptRecorded,
}) {
  const [status, setStatus] = useState('loading'); // loading | ready | checking | feedback | summary | error
  const [error, setError] = useState('');
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [bank, setBank] = useState([]);          // 사용 가능한 단어 인덱스
  const [arrangement, setArrangement] = useState([]); // 배열된 단어 인덱스
  const [feedback, setFeedback] = useState(null); // {isCorrect, feedback}
  const [summary, setSummary] = useState(null);
  const [results, setResults] = useState([]);     // 각 문항 채점 결과 boolean
  const [attempts, setAttempts] = useState([]);
  const [sessionContext, setSessionContext] = useState({ pickedTopics: [], vocabSampleCount: 0 });
  const [activeAsset, setActiveAsset] = useState(reviewAsset);

  // 드래그 상태 (pointer events 기반).
  // - dragInfoRef: pointerdown 시점 정보. threshold 통과 전에는 null이 아닌 ref.
  // - drag (state): 실제 드래그 중일 때 ghost 위치 렌더링용.
  // - dropAtIdx: arrangement 내 인서션 위치 (placeholder 활성화).
  const dragInfoRef = useRef(null);
  const arrContainerRef = useRef(null);
  const [drag, setDrag] = useState(null);
  const [dropAtIdx, setDropAtIdx] = useState(null);

  const currentQuestion = questions[currentIndex];

  const initialize = (qs) => {
    if (!qs || qs.length === 0) return;
    const first = qs[0];
    const indices = (first.words || []).map((_, i) => i);
    setBank(indices);
    setArrangement([]);
  };

  const loadQuestions = async () => {
    setStatus('loading');
    setError('');
    setFeedback(null);
    setSummary(null);
    setResults([]);
    setAttempts([]);
    setActiveAsset(reviewAsset || null);

    if (reviewAsset?.payload?.questions) {
      try {
        const cleaned = (reviewAsset.payload.questions || []).filter((q) => Array.isArray(q.words) && q.target);
        if (cleaned.length === 0) throw new Error('저장된 문제 데이터가 비어 있습니다.');
        setQuestions(cleaned);
        setCurrentIndex(0);
        initialize(cleaned);
        setSessionContext({
          pickedTopics: reviewAsset.metadata?.pickedTopics || [],
          vocabSampleCount: reviewAsset.metadata?.vocabSampleCount || 0,
        });
        setStatus('ready');
      } catch (err) {
        setError(err.message || '저장된 TOEFL 문제를 불러오지 못했습니다.');
        setStatus('error');
      }
      return;
    }

    // 매 세션마다 단어/주제를 랜덤 픽 — toeflService 프롬프트에 다양성 입력 주입.
    const vocabularyWords =
      vocabSource && vocabSource.mode !== 'off' && Array.isArray(vocabSource.pool)
        ? sampleWords(vocabSource.pool, vocabSource.sampleSize || 12)
        : [];

    const pickedTopics =
      topicSelection?.enabled && Array.isArray(topicSelection.allTopics) && topicSelection.selectedIds?.length > 0
        ? pickRandomTopics(topicSelection.allTopics, topicSelection.selectedIds, topicSelection.pickCount || 1)
        : [];

    setSessionContext({ pickedTopics, vocabSampleCount: vocabularyWords.length });

    try {
      const data = await generateBuildSentenceSet({
        aiConfig,
        questionCount,
        targetScore,
        vocabularyWords,
        pickedTopics,
      });
      const cleaned = (data?.questions || []).filter((q) => Array.isArray(q.words) && q.target);
      if (cleaned.length === 0) throw new Error('문제 데이터가 비어 있습니다.');
      setQuestions(cleaned);
      setCurrentIndex(0);
      initialize(cleaned);
      if (typeof onAssetCreated === 'function') {
        const savedAsset = await onAssetCreated({
          mode: 'toefl-build',
          taskType: 'build-sentence',
          title: 'Build a Sentence',
          payload: { questions: cleaned },
          metadata: {
            targetScore,
            questionCount,
            vocabSampleCount: vocabularyWords.length,
            pickedTopics: pickedTopics.map((topic) => ({ id: topic.id, label: topic.label })),
          },
        });
        if (savedAsset) setActiveAsset(savedAsset);
      }
      setStatus('ready');
    } catch (err) {
      setError(err.message || '문제 생성 중 오류가 발생했습니다.');
      setStatus('error');
    }
  };

  useEffect(() => {
    loadQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionCount, targetScore, reviewAsset?.id]);

  const moveToArrangement = (idx) => {
    if (status !== 'ready') return;
    setBank((prev) => prev.filter((i) => i !== idx));
    setArrangement((prev) => [...prev, idx]);
  };

  const moveToBank = (idx) => {
    if (status !== 'ready') return;
    setArrangement((prev) => prev.filter((i) => i !== idx));
    setBank((prev) => [...prev, idx]);
  };

  const handleReset = () => {
    if (status !== 'ready' || !currentQuestion) return;
    const indices = currentQuestion.words.map((_, i) => i);
    setBank(indices);
    setArrangement([]);
  };

  // -------------------- 드래그 & 드롭 (pointer events) --------------------
  // pointerdown은 클릭 후보로 시작 — threshold 6px 넘어야 실제 드래그로 승격.
  const handlePointerDown = (area, sourceIdx, wordIdx) => (e) => {
    if (status !== 'ready') return;
    if (e.button !== undefined && e.button !== 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    dragInfoRef.current = {
      area, sourceIdx, wordIdx,
      startX: e.clientX, startY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      width: rect.width, height: rect.height,
      text: currentQuestion?.words?.[wordIdx] ?? '',
      hasMoved: false,
    };
  };

  // 글로벌 pointer 리스너 — 마운트 시 1회 등록, dragInfoRef로 fast-path 접근.
  useEffect(() => {
    const THRESHOLD = 6;

    const hitTest = (clientX, clientY) => {
      const arrEl = arrContainerRef.current;
      if (!arrEl) return null;
      const cr = arrEl.getBoundingClientRect();
      // 컨테이너 바깥(여유 16px) → null
      if (clientX < cr.left - 16 || clientX > cr.right + 16
          || clientY < cr.top - 16 || clientY > cr.bottom + 16) {
        return null;
      }
      const wordEls = arrEl.querySelectorAll('[data-arr-word]');
      if (wordEls.length === 0) return 0;

      // 가장 가까운 단어 중심점 + 좌/우 절반으로 인서션 인덱스 결정.
      let closestIdx = 0;
      let closestDist = Infinity;
      let isLeft = false;
      for (let i = 0; i < wordEls.length; i++) {
        const r = wordEls[i].getBoundingClientRect();
        const cx = (r.left + r.right) / 2;
        const cy = (r.top + r.bottom) / 2;
        const dist = Math.hypot(clientX - cx, clientY - cy);
        if (dist < closestDist) {
          closestDist = dist;
          closestIdx = i;
          isLeft = clientX < cx;
        }
      }
      return isLeft ? closestIdx : closestIdx + 1;
    };

    const onMove = (e) => {
      const info = dragInfoRef.current;
      if (!info) return;

      if (!info.hasMoved) {
        const dx = e.clientX - info.startX;
        const dy = e.clientY - info.startY;
        if (Math.hypot(dx, dy) < THRESHOLD) return;
        info.hasMoved = true;
      }

      // 텍스트 선택 등 기본 동작 차단
      if (e.cancelable) e.preventDefault();

      setDrag({
        area: info.area,
        sourceIdx: info.sourceIdx,
        wordIdx: info.wordIdx,
        text: info.text,
        width: info.width,
        height: info.height,
        ghostX: e.clientX - info.offsetX,
        ghostY: e.clientY - info.offsetY,
      });
      setDropAtIdx(hitTest(e.clientX, e.clientY));
    };

    const onUp = () => {
      const info = dragInfoRef.current;
      dragInfoRef.current = null;

      if (!info || !info.hasMoved) {
        // 클릭 — 네이티브 onClick이 처리.
        return;
      }

      // 드래그 종료 — drop 위치에 따라 commit.
      setDropAtIdx((currentDrop) => {
        if (currentDrop !== null) {
          if (info.area === 'bank') {
            setBank((prev) => prev.filter((_, i) => i !== info.sourceIdx));
            setArrangement((prev) => [
              ...prev.slice(0, currentDrop),
              info.wordIdx,
              ...prev.slice(currentDrop),
            ]);
          } else if (info.area === 'arr') {
            setArrangement((prev) => {
              const next = [...prev];
              const [moved] = next.splice(info.sourceIdx, 1);
              const finalIdx = currentDrop > info.sourceIdx ? currentDrop - 1 : currentDrop;
              next.splice(finalIdx, 0, moved);
              return next;
            });
          }
        }
        return null;
      });
      setDrag(null);
    };

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, []);

  const handleCheck = async () => {
    if (!currentQuestion || arrangement.length === 0 || status === 'checking') return;
    const userAttempt = arrangement.map((i) => currentQuestion.words[i]).join(' ');
    setAttempts((prev) => {
      const next = [...prev];
      next[currentIndex] = userAttempt;
      return next;
    });
    setStatus('checking');
    setFeedback(null);
    try {
      const result = await generateBuildSentenceFeedback({
        aiConfig,
        target: currentQuestion.target,
        userAttempt,
      });
      const isCorrect = Boolean(result?.isCorrect);
      setFeedback({
        isCorrect,
        feedback: result?.feedback || (isCorrect ? '정답입니다!' : '다시 한번 시도해보세요.'),
      });
      setResults((prev) => {
        const next = [...prev];
        next[currentIndex] = isCorrect;
        return next;
      });
      playSound(isCorrect ? 'SUCCESS' : 'FAIL');
      setStatus('feedback');
    } catch (err) {
      // AI 호출 실패 시 정확 일치 폴백 (대소문자/공백 무시)
      const normalize = (s) => String(s).trim().replace(/\s+/g, ' ').toLowerCase();
      const isExact = normalize(userAttempt) === normalize(currentQuestion.target);
      setFeedback({
        isCorrect: isExact,
        feedback: isExact
          ? '정답입니다! (AI 채점 실패 — 정확 일치 기준으로 판정)'
          : 'AI 채점에 실패했습니다. 정확 일치 기준으로는 오답입니다.',
      });
      setResults((prev) => {
        const next = [...prev];
        next[currentIndex] = isExact;
        return next;
      });
      playSound(isExact ? 'SUCCESS' : 'FAIL');
      setStatus('feedback');
    }
  };

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      const nextIdx = currentIndex + 1;
      const nextQ = questions[nextIdx];
      setCurrentIndex(nextIdx);
      const indices = (nextQ.words || []).map((_, i) => i);
      setBank(indices);
      setArrangement([]);
      setFeedback(null);
      setStatus('ready');
      return;
    }

    // 마지막 → 종합 리포트
    setStatus('checking');
    const correctCount = results.filter(Boolean).length;
    const summaryPayload = `${correctCount}/${questions.length} correct`;
    const attemptResults = questions.map((question, index) => ({
      questionIndex: index,
      target: question.target,
      attempt: attempts[index] || (index === currentIndex
        ? arrangement.map((wordIndex) => question.words[wordIndex]).join(' ')
        : ''),
      correct: Boolean(results[index]),
    }));
    try {
      const data = await generateBuildSentenceSummary({
        aiConfig,
        targetScore,
        results: summaryPayload,
      });
      setSummary(data || { summary: '종합 리포트를 불러오지 못했습니다.', strengths: [], improvements: [], nextSteps: [] });
    } catch {
      setSummary({
        summary: 'AI 종합 피드백을 불러오지 못했습니다.',
        strengths: [], improvements: [], nextSteps: [],
      });
    } finally {
      if (activeAsset && typeof onAttemptRecorded === 'function') {
        await onAttemptRecorded(activeAsset, {
          answers: { attempts },
          results: { questions: attemptResults },
          correctCount,
          totalCount: questions.length,
          score: {
            accuracy: questions.length > 0 ? correctCount / questions.length : 0,
          },
        });
      }
      setStatus('summary');
      playSound('COMPLETE');
    }
  };

  const totalQuestions = questions.length;
  const correctCount = results.filter(Boolean).length;

  if (status === 'loading') {
    return (
      <div className="bg-white rounded-xl border border-brand-100 shadow-[var(--shadow-soft)] p-10 text-center">
        <Sparkles className="w-10 h-10 text-brand-400 mx-auto mb-4 animate-pulse" aria-hidden="true" />
        <h3 className="text-xl font-black text-surface-900 mb-2 tracking-tight">TOEFL 문장 구성 문제를 생성 중입니다</h3>
        <p className="text-sm font-bold text-surface-500">학술 문장을 준비하고 있어요.</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="bg-white rounded-xl border border-danger-100 shadow-[var(--shadow-soft)] p-10 text-center">
        <h3 className="text-xl font-black text-surface-900 mb-2 tracking-tight">문제 생성 실패</h3>
        <p className="text-sm font-bold text-danger-500 mb-6">{error}</p>
        <div className="flex items-center justify-center gap-3">
          <Button variant="primary" size="md" onClick={loadQuestions}>다시 시도</Button>
          <Button variant="secondary" size="md" onClick={onExit}>모드 선택으로</Button>
        </div>
      </div>
    );
  }

  if (status === 'summary' && summary) {
    return (
      <div className="bg-white rounded-xl border border-surface-200 shadow-[var(--shadow-soft)] p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-surface-900 tracking-tight">학습 완료 리포트</h2>
            <p className="text-sm font-bold text-surface-500">
              정답 {correctCount} / {totalQuestions} · 목표 TOEFL {targetScore}+
            </p>
          </div>
          <Button variant="secondary" size="md" onClick={onExit}>모드 선택으로</Button>
        </div>
        <div className="bg-brand-50 border border-brand-100 rounded-xl p-6">
          <p className="text-sm font-bold text-brand-900">{summary.summary}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: '강점',     items: summary.strengths },
            { title: '개선점',   items: summary.improvements },
            { title: '다음 학습', items: summary.nextSteps },
          ].map((section) => (
            <div key={section.title} className="bg-surface-50 rounded-xl p-4">
              <h4 className="font-black text-surface-900 mb-2 tracking-tight">{section.title}</h4>
              <ul className="text-sm text-surface-600 space-y-1 list-disc list-inside">
                {(section.items || []).map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="bg-white rounded-xl border border-surface-200 shadow-[var(--shadow-soft)] p-10 text-center">
        <h3 className="text-xl font-black text-surface-900 mb-2 tracking-tight">문제를 불러올 수 없습니다</h3>
        <Button variant="primary" size="md" onClick={loadQuestions}>다시 생성</Button>
      </div>
    );
  }

  const isChecking = status === 'checking';
  const isFeedback = status === 'feedback';
  const canCheck = arrangement.length > 0 && status === 'ready';

  return (
    <div className="bg-white rounded-xl border border-surface-200 shadow-[var(--shadow-soft)] p-4 md:p-8 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-surface-900 tracking-tight">Build a Sentence</h2>
          <p className="text-sm font-bold text-surface-500">
            단어를 클릭해 올바른 순서로 문장을 완성하세요. (문항 {currentIndex + 1}/{totalQuestions})
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 max-w-full">
          <span className="inline-flex items-center shrink-0 whitespace-nowrap px-3 py-1 rounded-pill bg-brand-50 text-brand-700 font-black text-2xs uppercase tracking-widest">
            TOEFL {targetScore}+
          </span>
          {sessionContext.vocabSampleCount > 0 && (
            <span className="inline-flex items-center shrink-0 whitespace-nowrap px-3 py-1 rounded-pill bg-brand-50 text-brand-700 font-black text-2xs uppercase tracking-widest">
              내 단어 {sessionContext.vocabSampleCount}개 활용
            </span>
          )}
          {sessionContext.pickedTopics.length > 0 && (
            <span
              title={sessionContext.pickedTopics.map((t) => t.label).join(' · ')}
              className="inline-flex items-center max-w-full px-3 py-1 rounded-pill bg-accent-50 text-accent-700 font-black text-2xs uppercase tracking-widest"
            >
              <span className="truncate">주제: {sessionContext.pickedTopics.map((t) => t.label).join(' · ')}</span>
            </span>
          )}
        </div>
      </div>

      {/* 힌트 */}
      <div className="bg-surface-50 rounded-md p-4 md:p-6 border border-surface-100">
        <p className="text-2xs font-black text-surface-400 uppercase tracking-widest mb-2">Hint (Korean)</p>
        <p className="text-base md:text-lg font-bold text-surface-800 leading-relaxed">
          {currentQuestion.hint || '힌트가 제공되지 않았습니다.'}
        </p>
      </div>

      {/* 답안 영역 */}
      <div>
        <p className="text-2xs font-black text-surface-400 uppercase tracking-widest mb-2">Your Sentence</p>
        <div
          ref={arrContainerRef}
          className={`min-h-[5rem] rounded-md p-4 border-2 border-dashed flex flex-wrap items-center gap-2 transition-colors ${
            isFeedback
              ? feedback?.isCorrect
                ? 'border-success-400 bg-success-50/40'
                : 'border-danger-400 bg-danger-50/40'
              : drag
                ? 'border-brand-400 bg-brand-50/40'
                : arrangement.length > 0
                  ? 'border-brand-300 bg-brand-50/30'
                  : 'border-surface-200 bg-surface-50/40'
          }`}
        >
          {arrangement.length === 0 && !drag ? (
            <span className="text-sm font-semibold text-surface-400">
              아래 단어를 클릭하거나 드래그해 배치하세요.
            </span>
          ) : (
            <>
              {/* 시작 placeholder — 첫 단어 앞 */}
              <DropPlaceholder active={dropAtIdx === 0} drag={drag} />

              {arrangement.map((idx, i) => {
                const isSource = drag && drag.area === 'arr' && drag.sourceIdx === i;
                return (
                  <React.Fragment key={`arr-${idx}-${i}`}>
                    <button
                      type="button"
                      data-arr-word={i}
                      onPointerDown={handlePointerDown('arr', i, idx)}
                      onClick={() => moveToBank(idx)}
                      disabled={isChecking || isFeedback}
                      aria-label={`${currentQuestion.words[idx]} — 클릭으로 제거 또는 드래그로 위치 변경`}
                      style={{ touchAction: 'none' }}
                      className={`px-3 py-1.5 rounded-sm border font-bold text-sm transition-colors ${
                        isSource
                          ? 'bg-brand-50/60 border-brand-200 text-brand-300 opacity-30 cursor-grabbing'
                          : isFeedback
                            ? 'bg-white border-surface-200 text-surface-600 cursor-default'
                            : 'bg-white border-brand-300 text-brand-700 hover:border-brand-500 hover:bg-brand-50 cursor-grab'
                      }`}
                    >
                      {currentQuestion.words[idx]}
                    </button>
                    <DropPlaceholder active={dropAtIdx === i + 1} drag={drag} />
                  </React.Fragment>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* 단어 은행 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-2xs font-black text-surface-400 uppercase tracking-widest">Word Bank</p>
          {!isFeedback && arrangement.length > 0 && (
            <button
              type="button"
              onClick={handleReset}
              disabled={isChecking}
              className="text-2xs font-black text-surface-500 hover:text-brand-600 uppercase tracking-widest transition-colors"
            >
              Reset
            </button>
          )}
        </div>
        <div className="rounded-md p-4 border border-surface-200 bg-white flex flex-wrap gap-2 min-h-[4rem]">
          {bank.length === 0 ? (
            <span className="text-sm font-semibold text-surface-400 self-center">사용 가능한 단어가 없습니다.</span>
          ) : (
            bank.map((idx, i) => {
              const isSource = drag && drag.area === 'bank' && drag.sourceIdx === i;
              return (
                <button
                  key={`bank-${idx}-${i}`}
                  type="button"
                  onPointerDown={handlePointerDown('bank', i, idx)}
                  onClick={() => moveToArrangement(idx)}
                  disabled={isChecking || isFeedback}
                  aria-label={`${currentQuestion.words[idx]} — 클릭으로 끝에 추가 또는 드래그로 원하는 위치에 배치`}
                  style={{ touchAction: 'none' }}
                  className={`px-3 py-1.5 rounded-sm border font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    isSource
                      ? 'bg-surface-100 border-surface-300 text-surface-300 opacity-40 cursor-grabbing'
                      : 'bg-surface-50 border-surface-200 text-surface-800 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 cursor-grab'
                  }`}
                >
                  {currentQuestion.words[idx]}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 피드백 */}
      {isFeedback && feedback && (
        <div className={`rounded-md p-4 border ${
          feedback.isCorrect ? 'bg-success-50 border-success-200' : 'bg-danger-50 border-danger-200'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${
              feedback.isCorrect ? 'bg-success-500 text-white' : 'bg-danger-500 text-white'
            }`}>
              {feedback.isCorrect
                ? <Check className="w-5 h-5 stroke-[3px]" aria-hidden="true" />
                : <X className="w-5 h-5 stroke-[3px]" aria-hidden="true" />}
            </div>
            <div className="flex-1 space-y-1">
              <p className={`text-sm font-black tracking-tight ${
                feedback.isCorrect ? 'text-success-700' : 'text-danger-700'
              }`}>
                {feedback.isCorrect ? '정답입니다! 🎉' : '다시 확인해보세요.'}
              </p>
              <p className="text-sm text-surface-700 leading-relaxed">{feedback.feedback}</p>
              {!feedback.isCorrect && (
                <p className="text-xs text-surface-500 pt-2">
                  <span className="font-black">정답:</span> {currentQuestion.target}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 액션 */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-2">
        <div className="text-sm text-surface-600 flex items-center gap-3">
          <span className="px-3 py-1 rounded-pill bg-brand-50 text-brand-700 font-black text-xs">
            배치 {arrangement.length}개
          </span>
          <span className="px-3 py-1 rounded-pill bg-surface-100 text-surface-700 font-black text-xs">
            남은 단어 {bank.length}개
          </span>
        </div>
        <div className="flex items-center gap-3">
          {!isFeedback ? (
            <Button
              variant="primary"
              size="md"
              onClick={handleCheck}
              disabled={!canCheck || isChecking}
            >
              {isChecking ? '채점 중...' : '정답 확인'}
            </Button>
          ) : (
            <Button variant="primary" size="md" onClick={handleNext} disabled={isChecking}>
              {currentIndex < totalQuestions - 1
                ? '다음 문항'
                : isChecking ? '리포트 생성 중...' : '학습 완료'}
            </Button>
          )}
        </div>
      </div>

      {/* 드래그 고스트 — 커서를 따라다니는 부유 단어 카드 */}
      {drag && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            left: drag.ghostX,
            top: drag.ghostY,
            width: drag.width,
            height: drag.height,
            pointerEvents: 'none',
            zIndex: 9999,
            transform: 'rotate(-2deg) scale(1.05)',
            transformOrigin: 'center',
          }}
          className="px-3 py-1.5 rounded-sm border-2 border-brand-500 bg-white text-brand-700 font-bold text-sm shadow-[var(--shadow-floating)] flex items-center justify-center select-none"
        >
          {drag.text}
        </div>
      )}
    </div>
  );
}
