import React from 'react';
import { Layers } from '../Icons';
import { SectionHead } from './QuizConfigControls';

export function VocabScopeSection({
  filteredWords,
  flaggedWordCount,
  folders,
  selectedFolderIds,
  setSelectedFolderIds,
  setWordScope,
  toggleFolder,
  wordCountByFolder,
  wordScope,
  words,
}) {
  return (
    <section className="space-y-5 sm:space-y-6">
      <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SectionHead
          icon={Layers}
          title="출제 범위 설정"
          subtitle="전체, 플래그, 폴더 중 학습할 단어 묶음을 고르세요"
        />
        <div data-testid="quiz-config-scope-actions" className="flex self-start items-center gap-2 rounded-pill bg-surface-50 p-1 sm:gap-4 sm:bg-transparent sm:p-0">
          <button
            onClick={() => {
              setWordScope('all');
              setSelectedFolderIds([]);
            }}
            className="rounded-pill px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-surface-400 transition-colors hover:text-brand-600 sm:px-0 sm:py-0 sm:text-2xs sm:tracking-widest"
          >
            전체
          </button>
          <button
            onClick={() => {
              setWordScope('folders');
              setSelectedFolderIds(folders.map(f => f.id));
            }}
            className="rounded-pill px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-brand-600 hover:underline sm:px-0 sm:py-0 sm:text-2xs sm:tracking-widest"
          >
            폴더 전체
          </button>
        </div>
      </div>

      <div className="rounded-card border border-surface-100 bg-surface-50/50 p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setWordScope('all');
              setSelectedFolderIds([]);
            }}
            aria-pressed={wordScope === 'all' && selectedFolderIds.length === 0}
            className={[
              'flex min-h-[72px] items-center justify-between gap-4 rounded-xl border px-4 py-3 text-left transition-all',
              wordScope === 'all' && selectedFolderIds.length === 0
                ? 'border-brand-300 bg-brand-50 text-brand-800 shadow-sm'
                : 'border-surface-100 bg-white text-surface-700 hover:border-brand-200',
            ].join(' ')}
          >
            <span className="min-w-0">
              <span className="block text-sm font-black">전체 단어</span>
              <span className="block text-xs font-bold text-surface-400">{words.length}개</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setWordScope('flagged');
              setSelectedFolderIds([]);
            }}
            aria-pressed={wordScope === 'flagged'}
            className={[
              'flex min-h-[72px] items-center justify-between gap-4 rounded-xl border px-4 py-3 text-left transition-all',
              wordScope === 'flagged'
                ? 'border-warning-300 bg-warning-50 text-warning-900 shadow-sm'
                : 'border-surface-100 bg-white text-surface-700 hover:border-warning-200',
            ].join(' ')}
          >
            <span className="min-w-0">
              <span className="block text-sm font-black">플래그한 단어만</span>
              <span className="block text-xs font-bold text-surface-400">{flaggedWordCount}개</span>
            </span>
          </button>
        </div>

        {folders.length > 0 && (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {folders.map((folder) => {
              const selected = wordScope === 'folders' && selectedFolderIds.includes(folder.id);
              return (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => toggleFolder(folder.id)}
                  aria-pressed={selected}
                  className={[
                    'flex min-h-[64px] items-center justify-between gap-4 rounded-xl border px-4 py-3 text-left transition-all',
                    selected
                      ? 'border-brand-300 bg-white text-brand-800 shadow-sm ring-2 ring-brand-100'
                      : 'border-surface-100 bg-white text-surface-700 hover:border-brand-200',
                  ].join(' ')}
                >
                  <span className="min-w-0 whitespace-normal break-words text-sm font-black leading-snug">
                    {folder.name}
                  </span>
                  <span className={`shrink-0 rounded-pill px-2 py-1 text-2xs font-black ${
                    selected ? 'bg-brand-100 text-brand-700' : 'bg-surface-100 text-surface-400'
                  }`}>
                    {wordCountByFolder[folder.id] || 0}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex w-full items-center gap-3 rounded-xl border border-brand-100/50 bg-brand-50/50 px-4 py-3 sm:w-fit sm:px-5">
        <span className={`w-2 h-2 rounded-pill ${filteredWords.length > 0 ? 'bg-brand-500 animate-pulse' : 'bg-surface-300'}`} aria-hidden="true" />
        <p className="text-xs font-bold text-surface-600">
          선택된 범위: <span className="text-brand-600 font-black text-sm">{filteredWords.length}</span>개의 단어
        </p>
      </div>
    </section>
  );
}
