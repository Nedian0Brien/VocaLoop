import React from 'react';
import { Plus, Sparkles } from '../Icons';
import { Button } from '../../design-system';
import { SectionHead, ToggleCard, TopicChip } from './QuizConfigControls';

export function TopicSelectionSection({
  commitEditTopic,
  editingTopic,
  handleAddTopic,
  handleRemoveTopic,
  newTopicDesc,
  newTopicLabel,
  selectedTopicIds,
  setEditingTopic,
  setNewTopicDesc,
  setNewTopicLabel,
  setSelectedTopicIds,
  setTopicEnabled,
  setTopicError,
  setTopicPickCount,
  startEditTopic,
  toggleTopic,
  topicEnabled,
  topicError,
  topicPickCount,
  topics,
}) {
  return (
    <section className="space-y-6 pt-4 border-t border-surface-50">
      <SectionHead
        icon={Sparkles}
        title="주제 분야"
        subtitle="사전 정의된 분야 set 에서 무작위 픽 — 같은 모드에서도 다양성 확보"
        tone="accent"
      />

      <ToggleCard
        on={topicEnabled}
        onChange={() => setTopicEnabled((v) => !v)}
        title={`분야 강조 ${topicEnabled ? 'ON' : 'OFF'}`}
        desc="선택한 분야 중 일부를 무작위로 뽑아 AI 프롬프트에 전달합니다."
        tone="accent"
        activeIcon={Sparkles}
      />

      {topicEnabled && (
        <div className="space-y-5 bg-accent-50/30 border border-accent-100 rounded-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-2xs font-black text-accent-700 uppercase tracking-widest">분야 선택 (multi-select)</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedTopicIds([])}
                className="text-2xs font-black text-surface-400 uppercase tracking-widest hover:text-accent-600 transition-colors"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setSelectedTopicIds(topics.map((t) => t.id))}
                className="text-2xs font-black text-accent-600 uppercase tracking-widest hover:underline"
              >
                Select All
              </button>
            </div>
          </div>

          <div className="bg-white rounded-card border border-surface-100 p-4">
            <div className="flex flex-wrap gap-2">
              {topics.map((topic) => (
                <TopicChip
                  key={topic.id}
                  topic={topic}
                  selected={selectedTopicIds.includes(topic.id)}
                  onToggle={toggleTopic}
                  onRemove={handleRemoveTopic}
                  onEdit={startEditTopic}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-2xs font-black text-accent-700 uppercase tracking-widest shrink-0">픽 개수</p>
              <span className="text-2xs font-black text-surface-500 shrink-0">매 세션마다 무작위 N개</span>
            </div>
            <div className="inline-flex shrink-0 whitespace-nowrap rounded-pill bg-white border border-accent-100 p-1 shadow-[var(--shadow-soft)]">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setTopicPickCount(n)}
                  aria-pressed={topicPickCount === n}
                  className={[
                    'w-10 h-8 rounded-pill text-xs font-black transition-all',
                    topicPickCount === n
                      ? 'bg-accent-600 text-white shadow-[var(--shadow-card)]'
                      : 'text-accent-600 hover:bg-accent-50',
                  ].join(' ')}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {editingTopic ? (
            <div className="space-y-3 bg-white rounded-card border border-accent-200 p-5">
              <p className="text-2xs font-black text-accent-700 uppercase tracking-widest">분야 편집</p>
              <input
                type="text"
                value={editingTopic.label}
                onChange={(e) => setEditingTopic((prev) => ({ ...prev, label: e.target.value }))}
                placeholder="분야 이름"
                aria-label="분야 이름"
                className="w-full text-sm px-3 py-2.5 border border-surface-200 rounded-md bg-surface-50 text-surface-900 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:bg-surface-0"
              />
              <input
                type="text"
                value={editingTopic.description}
                onChange={(e) => setEditingTopic((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="설명 (선택) — 예: Cosmology, Planetary Science"
                aria-label="분야 설명"
                className="w-full text-sm px-3 py-2.5 border border-surface-200 rounded-md bg-surface-50 text-surface-900 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:bg-surface-0"
              />
              {topicError && <p className="text-2xs font-black text-danger-500">{topicError}</p>}
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => { setEditingTopic(null); setTopicError(''); }}>
                  취소
                </Button>
                <Button variant="primary" size="sm" onClick={commitEditTopic} disabled={!editingTopic.label.trim()}>
                  수정 완료
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 bg-white rounded-card border border-surface-100 p-5">
              <p className="text-2xs font-black text-accent-700 uppercase tracking-widest">새 분야 추가</p>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.4fr_auto] gap-2">
                <input
                  type="text"
                  value={newTopicLabel}
                  onChange={(e) => setNewTopicLabel(e.target.value)}
                  placeholder="예: 인류학"
                  aria-label="새 분야 이름"
                  className="min-w-0 text-sm px-3 py-2.5 border border-surface-200 rounded-md bg-surface-50 text-surface-900 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:bg-surface-0"
                />
                <input
                  type="text"
                  value={newTopicDesc}
                  onChange={(e) => setNewTopicDesc(e.target.value)}
                  placeholder="설명 (선택)"
                  aria-label="새 분야 설명"
                  className="min-w-0 text-sm px-3 py-2.5 border border-surface-200 rounded-md bg-surface-50 text-surface-900 placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:bg-surface-0"
                />
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={Plus}
                  onClick={handleAddTopic}
                  disabled={!newTopicLabel.trim()}
                >
                  추가
                </Button>
              </div>
              {topicError && <p className="text-2xs font-black text-danger-500">{topicError}</p>}
              <p className="text-2xs font-bold text-surface-400 leading-relaxed">
                기본 분야는 삭제되지 않습니다. 사용자 정의 분야만 편집/삭제 가능합니다.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-white rounded-pill border border-accent-100">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-pill ${selectedTopicIds.length > 0 ? 'bg-accent-600 animate-pulse' : 'bg-surface-300'}`} aria-hidden="true" />
              <p className="text-2xs font-black text-surface-600 uppercase tracking-widest">선택된 분야</p>
            </div>
            <p className="text-sm font-black text-accent-700">
              {selectedTopicIds.length}개 · 픽 {Math.min(topicPickCount, Math.max(selectedTopicIds.length, 1))}/세션
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
