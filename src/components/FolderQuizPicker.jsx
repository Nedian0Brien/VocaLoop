import React from 'react';
import {
    Folder, FolderOpen, BookOpen, Brain, Trophy, Target, FileText, TrendingUp, Shield,
    Check, Sparkles
} from './Icons';

/**
 * 폴더 색상 팔레트.
 * 사용자가 폴더에 지정한 색이므로 디자인 토큰으로 좁히지 않고
 * 다양한 raw Tailwind 색을 유지합니다 (사용자 데이터 호환성).
 */
const FOLDER_COLORS = [
    { name: 'blue',   bg: 'bg-blue-100',   text: 'text-blue-600',   dot: 'bg-blue-500',   activeBg: 'bg-blue-600' },
    { name: 'purple', bg: 'bg-purple-100', text: 'text-purple-600', dot: 'bg-purple-500', activeBg: 'bg-purple-600' },
    { name: 'green',  bg: 'bg-green-100',  text: 'text-green-600',  dot: 'bg-green-500',  activeBg: 'bg-green-600' },
    { name: 'orange', bg: 'bg-orange-100', text: 'text-orange-600', dot: 'bg-orange-500', activeBg: 'bg-orange-600' },
    { name: 'pink',   bg: 'bg-pink-100',   text: 'text-pink-600',   dot: 'bg-pink-500',   activeBg: 'bg-pink-600' },
    { name: 'teal',   bg: 'bg-teal-100',   text: 'text-teal-600',   dot: 'bg-teal-500',   activeBg: 'bg-teal-600' },
];
const getColorClasses = (name) => FOLDER_COLORS.find(c => c.name === name) || FOLDER_COLORS[0];

const FOLDER_ICONS = [
    { id: 'book',     component: BookOpen },
    { id: 'brain',    component: Brain },
    { id: 'trophy',   component: Trophy },
    { id: 'target',   component: Target },
    { id: 'sparkles', component: Sparkles },
    { id: 'file',     component: FileText },
    { id: 'trend',    component: TrendingUp },
    { id: 'shield',   component: Shield },
];
const getIconComponent = (id) => FOLDER_ICONS.find(i => i.id === id)?.component ?? null;
const isEmoji = (str) => Boolean(str) && /\p{Emoji}/u.test(str);

export default function FolderQuizPicker({ folders, words, quizFolderIds = [], onToggleFolder }) {
    if (!folders || folders.length === 0) return null;

    const totalCount = words.length;
    const folderCounts = {};
    words.forEach(w => {
        if (w.folderId) folderCounts[w.folderId] = (folderCounts[w.folderId] || 0) + 1;
    });

    const isAllSelected = quizFolderIds.length === 0;
    const selectedWordCount = isAllSelected
        ? totalCount
        : quizFolderIds.reduce((sum, id) => sum + (folderCounts[id] || 0), 0);

    return (
        <div className="bg-white rounded-card shadow-[var(--shadow-soft)] border border-surface-200 p-6 mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center">
                        <Folder className="w-5 h-5 text-brand-600" aria-hidden="true" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-surface-900 tracking-tight">출제 범위 선택</h3>
                        <p className="text-2xs text-surface-500 font-bold uppercase tracking-widest">Select Folders to Study</p>
                    </div>
                </div>
                {!isAllSelected && (
                    <div className="px-3 py-1 bg-brand-50 rounded-pill border border-brand-100 animate-in zoom-in duration-300">
                        <span className="text-xs font-black text-brand-700">
                            {quizFolderIds.length}개 선택됨
                        </span>
                    </div>
                )}
            </div>

            <div className="flex flex-wrap gap-2.5">
                {/* All Words Chip */}
                <button
                    onClick={() => onToggleFolder(null)}
                    className={[
                        'group flex items-center gap-2 px-5 py-2.5 rounded-pill text-sm font-bold',
                        'transition-all duration-300 border-2',
                        isAllSelected
                            ? 'bg-surface-900 text-white border-surface-900 shadow-[var(--shadow-card)] scale-[1.02]'
                            : 'bg-white text-surface-500 border-surface-100 hover:border-surface-300 hover:bg-surface-50',
                    ].join(' ')}
                >
                    <FolderOpen className={`w-4 h-4 ${isAllSelected ? 'text-brand-400' : 'text-surface-400 group-hover:text-surface-600'}`} aria-hidden="true" />
                    <span>전체 단어</span>
                    <span className={`text-2xs font-black px-2 py-0.5 rounded-pill ml-1 ${
                        isAllSelected ? 'bg-white/20 text-white' : 'bg-surface-100 text-surface-500'
                    }`}>
                        {totalCount}
                    </span>
                </button>

                {/* Folder Chips */}
                {folders.map(folder => {
                    const color = getColorClasses(folder.color);
                    const count = folderCounts[folder.id] || 0;
                    const isSelected = quizFolderIds.includes(folder.id);
                    const isEmpty = count === 0;

                    const icon = folder.icon;
                    const iconIsEmoji = isEmoji(icon);
                    const FolderIcon = !iconIsEmoji ? getIconComponent(icon) : null;

                    return (
                        <button
                            key={folder.id}
                            onClick={() => onToggleFolder(folder.id)}
                            disabled={isEmpty}
                            className={[
                                'group flex items-center gap-2 px-5 py-2.5 rounded-pill text-sm font-bold',
                                'transition-all duration-300 border-2',
                                isEmpty
                                    ? 'bg-surface-50 text-surface-300 border-surface-50 cursor-not-allowed opacity-60'
                                    : isSelected
                                        ? `${color.activeBg} text-white border-transparent shadow-[var(--shadow-card)] scale-[1.02]`
                                        : `bg-white ${color.text} border-surface-100 hover:border-surface-200 hover:bg-surface-50 hover:shadow-[var(--shadow-soft)]`,
                            ].join(' ')}
                        >
                            {isSelected ? (
                                <Check className="w-3.5 h-3.5 text-white animate-in zoom-in duration-300" aria-hidden="true" />
                            ) : iconIsEmoji ? (
                                <span className="text-sm">{icon}</span>
                            ) : FolderIcon ? (
                                <FolderIcon className="w-3.5 h-3.5" aria-hidden="true" />
                            ) : (
                                <div className={`w-2.5 h-2.5 rounded-pill ${color.dot}`} aria-hidden="true" />
                            )}

                            <span className="truncate max-w-[120px]">{folder.name}</span>

                            <span className={`text-2xs font-black px-2 py-0.5 rounded-pill ml-1 ${
                                isEmpty
                                    ? 'bg-surface-100 text-surface-300'
                                    : isSelected
                                        ? 'bg-white/20 text-white'
                                        : `${color.bg} ${color.text}`
                            }`}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Summary Message */}
            <div className={`mt-6 overflow-hidden transition-all duration-500 ${!isAllSelected ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className={`flex items-center gap-3 p-4 rounded-md border ${
                    selectedWordCount > 0
                        ? 'bg-brand-50/50  border-brand-100  text-brand-700'
                        : 'bg-warning-50/50 border-warning-100 text-warning-700'
                }`}>
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${
                        selectedWordCount > 0 ? 'bg-brand-100 text-brand-600' : 'bg-warning-100 text-warning-600'
                    }`}>
                        <Sparkles className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <p className="text-xs font-semibold leading-relaxed">
                        {selectedWordCount > 0 ? (
                            <>선택한 폴더의 <span className="text-sm font-black underline underline-offset-4 decoration-brand-200">{selectedWordCount}개</span> 단어로 학습을 시작합니다!</>
                        ) : (
                            <>선택된 폴더에 단어가 없습니다. 다른 폴더를 추가로 선택해 주세요.</>
                        )}
                    </p>
                </div>
            </div>
        </div>
    );
}
