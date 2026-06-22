import React from 'react';
import { BookOpen } from '../Icons';
import CompactFolderPicker from '../CompactFolderPicker';
import {
  VOCAB_SAMPLE_MAX,
  VOCAB_SAMPLE_MIN,
} from './quizConfigConstants';
import { SectionHead, ToggleCard } from './QuizConfigControls';
import { wordBelongsToFolder } from '../../utils/appDataTransforms';

export function ToeflVocabSourceSection({
  folders,
  setVocabFolderIds,
  setVocabMode,
  setVocabSampleSize,
  toeflVocabPool,
  toggleVocabFolder,
  vocabFolderIds,
  vocabMode,
  vocabPoolWarning,
  vocabSampleSize,
  words,
}) {
  const wordCountByFolder = folders.reduce((acc, f) => {
    acc[f.id] = words.filter((w) => wordBelongsToFolder(w, f.id)).length;
    return acc;
  }, {});

  return (
    <section className="space-y-6 pt-4 border-t border-surface-50">
      <SectionHead
        icon={BookOpen}
        title="내 단어장 활용"
        subtitle="수집한 단어들을 문제에 우선 노출시켜 학습 연계성 강화"
        tone="brand"
      />

      <ToggleCard
        on={vocabMode !== 'off'}
        onChange={() => setVocabMode((prev) => (prev === 'off' ? 'all' : 'off'))}
        title={`단어장 기반 출제 ${vocabMode === 'off' ? 'OFF' : 'ON'}`}
        desc="내 단어장에서 추출한 단어를 활용해 매번 다른 문장과 문단을 생성합니다."
        tone="brand"
        activeIcon={BookOpen}
      />

      {vocabMode !== 'off' && (
        <div className="space-y-5 bg-brand-50/40 border border-brand-100 rounded-card p-6">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-2xs font-black text-brand-700 uppercase tracking-widest shrink-0">단어 출처</p>
            <div className="inline-flex shrink-0 whitespace-nowrap rounded-pill bg-white border border-brand-100 p-1 shadow-[var(--shadow-soft)]">
              {[
                { id: 'all', label: '전체 단어' },
                { id: 'folders', label: '폴더 선택' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setVocabMode(opt.id)}
                  aria-pressed={vocabMode === opt.id}
                  className={[
                    'px-4 py-1.5 rounded-pill text-2xs font-black uppercase tracking-widest transition-all whitespace-nowrap',
                    vocabMode === opt.id
                      ? 'bg-brand-600 text-white shadow-[var(--shadow-card)]'
                      : 'text-brand-600 hover:bg-brand-50',
                  ].join(' ')}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {vocabMode === 'folders' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-2xs font-black text-brand-700 uppercase tracking-widest">대상 폴더</p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setVocabFolderIds([])}
                    className="text-2xs font-black text-surface-400 uppercase tracking-widest hover:text-brand-600 transition-colors"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => setVocabFolderIds(folders.map((f) => f.id))}
                    className="text-2xs font-black text-brand-600 uppercase tracking-widest hover:underline"
                  >
                    Select All
                  </button>
                </div>
              </div>

              {folders.length === 0 ? (
                <div className="bg-white border border-dashed border-surface-200 rounded-card p-5 text-center">
                  <p className="text-xs font-bold text-surface-500">등록된 폴더가 없습니다. 단어장에서 폴더를 먼저 생성해주세요.</p>
                </div>
              ) : (
                <div className="bg-white rounded-card border border-surface-100 p-3">
                  <CompactFolderPicker
                    folders={folders}
                    words={words}
                    selectedFolderId={null}
                    selectedFolderIds={vocabFolderIds}
                    onSelectFolder={toggleVocabFolder}
                    wordCountByFolder={wordCountByFolder}
                    totalWordCount={words.length}
                    isMultiSelect={true}
                  />
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-2xs font-black text-brand-700 uppercase tracking-widest">샘플 단어 개수</p>
              <span className="text-2xs font-black text-surface-500">최대 {VOCAB_SAMPLE_MAX}개</span>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={VOCAB_SAMPLE_MIN}
                max={VOCAB_SAMPLE_MAX}
                step={1}
                value={vocabSampleSize}
                onChange={(e) => setVocabSampleSize(Number(e.target.value))}
                aria-label="샘플 단어 개수"
                className="flex-1 h-2 bg-surface-100 rounded-pill appearance-none cursor-pointer accent-brand-600"
              />
              <span className="text-3xl font-black text-brand-700 tracking-tighter w-12 text-right">{vocabSampleSize}</span>
            </div>
            <p className="text-xs font-bold text-surface-500 leading-relaxed">
              선택한 풀에서 매 세션마다 무작위로 {vocabSampleSize}개 단어를 뽑아 AI 프롬프트에 포함시킵니다.
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-white rounded-pill border border-brand-100">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-pill ${toeflVocabPool.length > 0 ? 'bg-brand-500 animate-pulse' : 'bg-surface-300'}`} aria-hidden="true" />
              <p className="text-2xs font-black text-surface-600 uppercase tracking-widest">현재 풀</p>
            </div>
            <p className="text-sm font-black text-brand-700">{toeflVocabPool.length}개 단어</p>
          </div>

          {vocabPoolWarning && (
            <p className="text-2xs font-black text-warning-700 bg-warning-50 border border-warning-200 rounded-pill px-4 py-1.5 w-fit">
              {vocabPoolWarning}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
