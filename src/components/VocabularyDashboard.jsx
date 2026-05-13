import React, { useMemo } from 'react';
import WordCard from './WordCard';
import EmptyState from './EmptyState';
import FolderSidebar from './FolderSidebar';
import CompactFolderPicker from './CompactFolderPicker';
import { Folder, Loader2, Plus, Search, Sparkles } from './Icons';
import {
    getLearningStatus,
    LEARNING_STATUS,
    LEARNING_STATUS_CONFIG,
    groupWordsByStatus,
    sortByLearningRate,
} from '../utils/learningRate';
import { getCreatedAtValue } from '../utils/appDataTransforms';

export default function VocabularyDashboard({
    words,
    folders,
    selectedFolderId,
    onSelectFolder,
    showSidebar,
    isMobile,
    inputWord,
    setInputWord,
    setIsWordSuggestOpen,
    wordInputRef,
    shouldShowWordSuggestions,
    isAnalyzing,
    onAddWord,
    addToFolderId,
    setAddToFolderId,
    sortMode,
    setSortMode,
    onCreateFolder,
    onUpdateFolder,
    onDeleteFolder,
    onReorderFolders,
    onDeleteWord,
    onMoveWord,
    onRegenerateWord,
}) {
    const wordCountByFolder = useMemo(() => {
        const counts = {};
        words.forEach((word) => {
            const folderId = word.folderId || '__uncategorized';
            counts[folderId] = (counts[folderId] || 0) + 1;
        });
        return counts;
    }, [words]);

    const filteredWords = useMemo(() => {
        const base = selectedFolderId
            ? words.filter((word) => word.folderId === selectedFolderId)
            : words;

        switch (sortMode) {
            case 'learning-rate-asc':
                return sortByLearningRate(base, 'asc');
            case 'learning-rate-desc':
                return sortByLearningRate(base, 'desc');
            case 'status-group':
                return sortByLearningRate(base, 'asc');
            default:
                return [...base].sort((a, b) => getCreatedAtValue(b.createdAt) - getCreatedAtValue(a.createdAt));
        }
    }, [selectedFolderId, sortMode, words]);

    const wordStatusGroups = sortMode === 'status-group'
        ? groupWordsByStatus(filteredWords)
        : null;

    const renderWordCards = (wordList, includeLoading = false) => {
        const loadingCard = (
            <div key="generating-word-card" className="w-full h-64 relative animate-in fade-in zoom-in duration-300">
                <div className="w-full h-full rounded-xl bg-white shadow-[var(--shadow-soft)] border border-brand-200 overflow-hidden relative">
                    <div className="p-6 flex flex-col items-center justify-center text-center h-full opacity-40 blur-[2px]">
                        <span className="text-xs font-black text-brand-300 uppercase tracking-wider mb-2">Generating</span>
                        <h3 className="text-3xl font-bold text-surface-400 font-serif mb-2">{inputWord || 'New Word'}</h3>
                        <div className="w-8 h-8 rounded-pill border-4 border-surface-100 mt-4"></div>
                    </div>
                    <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center">
                        <Loader2 className="w-10 h-10 text-brand-600 animate-spin mb-3" aria-hidden="true" />
                        <p className="text-lg font-black text-brand-700 tracking-tight">단어 생성 중...</p>
                        <p className="text-sm font-semibold text-surface-600 mt-1">AI가 분석하고 있습니다</p>
                    </div>
                </div>
            </div>
        );

        const renderItem = (word, index) => (
            <div key={word.id} className="animate-slide-in" style={{ animationDelay: `${index * 0.05}s` }}>
                <WordCard
                    item={word}
                    handleDeleteWord={onDeleteWord}
                    folders={folders}
                    onMoveWord={onMoveWord}
                    onRegenerateWord={onRegenerateWord}
                />
            </div>
        );

        if (isMobile) {
            return (
                <div className="flex flex-col gap-4">
                    {includeLoading && loadingCard}
                    {wordList.map((word, index) => renderItem(word, index))}
                </div>
            );
        }

        const leftColumn = [];
        const rightColumn = [];

        if (includeLoading) {
            leftColumn.push(loadingCard);
            wordList.forEach((word, index) => {
                if (index % 2 === 0) rightColumn.push(renderItem(word, index));
                else leftColumn.push(renderItem(word, index));
            });
        } else {
            wordList.forEach((word, index) => {
                if (index % 2 === 0) leftColumn.push(renderItem(word, index));
                else rightColumn.push(renderItem(word, index));
            });
        }

        return (
            <div className="grid grid-cols-2 gap-4 items-start">
                <div className="flex flex-col gap-4">{leftColumn}</div>
                <div className="flex flex-col gap-4">{rightColumn}</div>
            </div>
        );
    };

    const renderMasonryLayout = () => {
        if (filteredWords.length === 0 && !isAnalyzing) {
            if (selectedFolderId && words.length > 0) {
                return (
                    <div className="text-center py-12 px-4">
                        <div className="w-16 h-16 bg-surface-50 text-surface-400 rounded-pill flex items-center justify-center mx-auto mb-4">
                            <Folder className="w-8 h-8" aria-hidden="true" />
                        </div>
                        <h3 className="text-lg font-black text-surface-900 mb-1 tracking-tight">이 폴더는 비어있습니다</h3>
                        <p className="text-surface-500 font-semibold">단어 카드의 폴더 버튼으로 단어를 이동할 수 있습니다.</p>
                    </div>
                );
            }
            return <EmptyState />;
        }

        if (wordStatusGroups) {
            const statusOrder = [LEARNING_STATUS.DIFFICULT, LEARNING_STATUS.LEARNING, LEARNING_STATUS.MEMORIZED];
            return (
                <div className="space-y-8">
                    {isAnalyzing && (
                        <div className="mb-8">
                            <div className="flex items-center gap-2 mb-3 px-1">
                                <span className="w-2.5 h-2.5 rounded-pill bg-brand-500 animate-pulse" aria-hidden="true" />
                                <h3 className="text-sm font-black uppercase tracking-wider text-brand-600">
                                    Creating New Word
                                </h3>
                            </div>
                            {renderWordCards([], true)}
                        </div>
                    )}
                    {statusOrder.map((status) => {
                        const groupWords = wordStatusGroups[status];
                        if (groupWords.length === 0) return null;
                        const config = LEARNING_STATUS_CONFIG[status];
                        return (
                            <div key={status}>
                                <div className="flex items-center gap-2 mb-3 px-1">
                                    <span className={`w-2.5 h-2.5 rounded-pill ${config.dotColor}`} aria-hidden="true" />
                                    <h3 className={`text-sm font-black uppercase tracking-wider ${config.textColor}`}>
                                        {config.label}
                                    </h3>
                                    <span className="text-xs text-surface-400 font-bold">
                                        {groupWords.length}개
                                    </span>
                                </div>
                                {renderWordCards(groupWords, false)}
                            </div>
                        );
                    })}
                </div>
            );
        }

        return renderWordCards(filteredWords, isAnalyzing);
    };

    const selectedFolderName = selectedFolderId
        ? folders.find((folder) => folder.id === selectedFolderId)?.name || '폴더'
        : null;

    return (
        <div className="flex flex-col lg:flex-row gap-8 items-start">
            {showSidebar && (
                <aside className="hidden lg:block w-64 flex-shrink-0 sticky top-8">
                    <FolderSidebar
                        folders={folders}
                        selectedFolderId={selectedFolderId}
                        onSelectFolder={onSelectFolder}
                        onCreateFolder={onCreateFolder}
                        onUpdateFolder={onUpdateFolder}
                        onDeleteFolder={onDeleteFolder}
                        wordCountByFolder={wordCountByFolder}
                        totalWordCount={words.length}
                    />
                </aside>
            )}

            <div className="flex-1 min-w-0 w-full">
                <div className="bg-white rounded-card shadow-[var(--shadow-soft)] border border-surface-200 p-6 mb-8 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-500 via-accent-500 to-brand-500 opacity-20"></div>
                    <h2 className="text-lg font-black text-surface-900 mb-4 flex items-center gap-2 tracking-tight">
                        <Plus className="w-5 h-5 text-brand-600" aria-hidden="true" />
                        Add New Word
                    </h2>
                    <form onSubmit={onAddWord} className="relative">
                        <div className="flex gap-3">
                            <div
                                className="relative flex-1 group"
                                onBlur={(event) => {
                                    if (!event.currentTarget.contains(event.relatedTarget)) {
                                        setIsWordSuggestOpen(false);
                                    }
                                }}
                            >
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors">
                                    <Search className="h-5 w-5 text-surface-400" aria-hidden="true" />
                                </div>
                                <input
                                    ref={wordInputRef}
                                    type="text"
                                    value={inputWord}
                                    onChange={(event) => {
                                        setInputWord(event.target.value);
                                        setIsWordSuggestOpen(true);
                                    }}
                                    onFocus={() => setIsWordSuggestOpen(true)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Escape') setIsWordSuggestOpen(false);
                                    }}
                                    placeholder="Enter an English word (e.g., Epiphany)"
                                    aria-label="새 영어 단어 입력"
                                    aria-autocomplete="list"
                                    aria-controls="word-autocomplete-suggestions"
                                    aria-expanded={shouldShowWordSuggestions}
                                    className="block w-full pl-10 pr-3 py-3 border border-surface-300 rounded-md leading-5 bg-surface-50 placeholder-surface-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
                                    disabled={isAnalyzing}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isAnalyzing || !inputWord.trim()}
                                style={{ backgroundPosition: isAnalyzing ? 'right center' : 'left center' }}
                                className={[
                                    'relative overflow-hidden px-6 py-3 rounded-md font-black text-white shadow-[var(--shadow-card)] transition-all duration-300',
                                    isAnalyzing ? 'cursor-wait pl-10' : 'hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5',
                                    'bg-gradient-to-r from-brand-600 via-indigo-pair-600 to-accent-600 bg-[length:200%_auto]',
                                    'disabled:opacity-70 disabled:cursor-not-allowed group',
                                ].join(' ')}
                            >
                                <div className="flex items-center gap-2 relative z-10">
                                    {isAnalyzing ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                                            <span>Crafting...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Generate</span>
                                            <Sparkles className="w-4 h-4 opacity-80 group-hover:scale-110 transition-transform" aria-hidden="true" />
                                        </>
                                    )}
                                </div>
                                {!isAnalyzing && <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:animate-[shimmer_1.5s_infinite] skew-x-12"></div>}
                            </button>
                        </div>
                        <div className="flex items-center justify-between mt-2 ml-1">
                            <p className="text-xs text-surface-500 flex items-center gap-1 font-semibold">
                                <span className="text-brand-600 font-black">AI Powered:</span> Definitions, examples, and nuances will be generated automatically.
                            </p>
                            {folders.length > 0 && (
                                <div className="flex items-center gap-1.5">
                                    <Folder className="w-3.5 h-3.5 text-surface-400" aria-hidden="true" />
                                    <select
                                        value={addToFolderId || ''}
                                        onChange={(event) => setAddToFolderId(event.target.value ? Number(event.target.value) : null)}
                                        aria-label="추가할 폴더 선택"
                                        className="text-xs border-surface-300 rounded-sm py-0.5 px-1.5 text-surface-600 focus:border-brand-300 focus:ring focus:ring-brand-200 focus:ring-opacity-50"
                                    >
                                        <option value="">미분류</option>
                                        {folders.map((folder) => (
                                            <option key={folder.id} value={folder.id}>{folder.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    </form>
                </div>

                <div className="space-y-6">
                    {!showSidebar && (
                        <CompactFolderPicker
                            folders={folders}
                            selectedFolderId={selectedFolderId}
                            onSelectFolder={onSelectFolder}
                            onCreateFolder={onCreateFolder}
                            onUpdateFolder={onUpdateFolder}
                            onDeleteFolder={onDeleteFolder}
                            onReorderFolders={onReorderFolders}
                            wordCountByFolder={wordCountByFolder}
                            totalWordCount={words.length}
                        />
                    )}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <h2 className="text-xl font-black text-surface-900 tracking-tight">
                            {selectedFolderName
                                ? `${selectedFolderName} (${filteredWords.length})`
                                : `My Vocabulary (${words.length})`}
                        </h2>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    const next = sortMode === 'status-group' ? 'newest' : 'status-group';
                                    setSortMode(next);
                                }}
                                title="학습 상태별 그룹 보기"
                                aria-pressed={sortMode === 'status-group'}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-black rounded-sm border transition-all ${
                                    sortMode === 'status-group'
                                        ? 'bg-brand-50 border-brand-200 text-brand-700'
                                        : 'bg-white border-surface-200 text-surface-600 hover:border-surface-300'
                                }`}
                            >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                                    <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                                </svg>
                                그룹
                            </button>
                            <select
                                value={sortMode}
                                onChange={(event) => setSortMode(event.target.value)}
                                aria-label="정렬 방식"
                                className="text-sm border-surface-300 rounded-sm shadow-sm focus:border-brand-300 focus:ring focus:ring-brand-200 focus:ring-opacity-50 text-surface-600"
                            >
                                <option value="newest">최신순</option>
                                <option value="learning-rate-asc">학습률 낮은 순</option>
                                <option value="learning-rate-desc">학습률 높은 순</option>
                                <option value="status-group">상태별 그룹</option>
                            </select>
                        </div>
                    </div>
                    {filteredWords.length > 0 && (
                        <div className="flex items-center gap-3 mt-3 px-1">
                            {[LEARNING_STATUS.MEMORIZED, LEARNING_STATUS.LEARNING, LEARNING_STATUS.DIFFICULT].map((status) => {
                                const config = LEARNING_STATUS_CONFIG[status];
                                const count = filteredWords.filter((word) => getLearningStatus(word.learningRate) === status).length;
                                return (
                                    <div key={status} className="flex items-center gap-1.5">
                                        <span className={`w-2 h-2 rounded-pill ${config.dotColor}`} aria-hidden="true" />
                                        <span className="text-xs text-surface-500 font-semibold">{config.label}</span>
                                        <span className={`text-xs font-black ${config.textColor}`}>{count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {renderMasonryLayout()}
                </div>
            </div>
        </div>
    );
}
