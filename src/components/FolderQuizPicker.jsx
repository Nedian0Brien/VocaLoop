import React from 'react';
import { Folder, FolderOpen, BookOpen, Check, Sparkles } from './Icons';

const FOLDER_COLORS = [
    { name: 'blue', bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200', dot: 'bg-blue-500', activeBg: 'bg-blue-600', ring: 'ring-blue-500' },
    { name: 'purple', bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200', dot: 'bg-purple-500', activeBg: 'bg-purple-600', ring: 'ring-purple-500' },
    { name: 'green', bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200', dot: 'bg-green-500', activeBg: 'bg-green-600', ring: 'ring-green-500' },
    { name: 'orange', bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200', dot: 'bg-orange-500', activeBg: 'bg-orange-600', ring: 'ring-orange-500' },
    { name: 'pink', bg: 'bg-pink-100', text: 'text-pink-600', border: 'border-pink-200', dot: 'bg-pink-500', activeBg: 'bg-pink-600', ring: 'ring-pink-500' },
    { name: 'teal', bg: 'bg-teal-100', text: 'text-teal-600', border: 'border-teal-200', dot: 'bg-teal-500', activeBg: 'bg-teal-600', ring: 'ring-teal-500' },
];

const getColorClasses = (colorName) => {
    return FOLDER_COLORS.find(c => c.name === colorName) || FOLDER_COLORS[0];
};

import { 
    BookOpen as IconBook, Brain, Trophy, Target, FileText, TrendingUp, Shield
} from './Icons';

const FOLDER_ICONS = [
    { id: 'book', component: IconBook },
    { id: 'brain', component: Brain },
    { id: 'trophy', component: Trophy },
    { id: 'target', component: Target },
    { id: 'sparkles', component: Sparkles },
    { id: 'file', component: FileText },
    { id: 'trend', component: TrendingUp },
    { id: 'shield', component: Shield },
];

const getIconComponent = (iconId) => {
    const icon = FOLDER_ICONS.find(i => i.id === iconId);
    return icon ? icon.component : null;
};

const isEmoji = (str) => {
    if (!str) return false;
    const emojiRegex = /\p{Emoji}/u;
    return emojiRegex.test(str);
};

export default function FolderQuizPicker({ folders, words, quizFolderIds = [], onToggleFolder }) {
    if (!folders || folders.length === 0) return null;

    const totalCount = words.length;
    const folderCounts = {};
    words.forEach(w => {
        if (w.folderId) {
            folderCounts[w.folderId] = (folderCounts[w.folderId] || 0) + 1;
        }
    });

    const isAllSelected = quizFolderIds.length === 0;

    const selectedWordCount = isAllSelected
        ? totalCount
        : quizFolderIds.reduce((sum, id) => sum + (folderCounts[id] || 0), 0);

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-2xl bg-blue-50 flex items-center justify-center">
                        <Folder className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900">출제 범위 선택</h3>
                        <p className="text-[11px] text-gray-500 font-medium uppercase tracking-tight">Select Folders to Study</p>
                    </div>
                </div>
                {!isAllSelected && (
                    <div className="px-3 py-1 bg-blue-50 rounded-full border border-blue-100 animate-in zoom-in duration-300">
                        <span className="text-xs font-bold text-blue-600">
                            {quizFolderIds.length}개 선택됨
                        </span>
                    </div>
                )}
            </div>

            <div className="flex flex-wrap gap-2.5">
                {/* All Words Chip */}
                <button
                    onClick={() => onToggleFolder(null)}
                    className={`
                        group flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold
                        transition-all duration-300 border-2
                        ${isAllSelected
                            ? 'bg-gray-900 text-white border-gray-900 shadow-lg scale-105'
                            : 'bg-white text-gray-500 border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                        }
                    `}
                >
                    <FolderOpen className={`w-4 h-4 ${isAllSelected ? 'text-blue-400' : 'text-gray-400 group-hover:text-gray-600'}`} />
                    <span>전체 단어</span>
                    <span className={`
                        text-[10px] font-black px-2 py-0.5 rounded-full ml-1
                        ${isAllSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}
                    `}>
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
                    const isIconEmoji = isEmoji(icon);
                    const FolderIcon = !isIconEmoji ? getIconComponent(icon) : null;

                    return (
                        <button
                            key={folder.id}
                            onClick={() => onToggleFolder(folder.id)}
                            disabled={isEmpty}
                            className={`
                                group flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold
                                transition-all duration-300 border-2
                                ${isEmpty
                                    ? 'bg-gray-50 text-gray-300 border-gray-50 cursor-not-allowed opacity-60'
                                    : isSelected
                                        ? `${color.activeBg} text-white border-transparent shadow-lg scale-105`
                                        : `bg-white ${color.text} border-gray-100 hover:border-gray-200 hover:bg-gray-50 hover:shadow-sm`
                                }
                            `}
                        >
                            {isSelected ? (
                                <Check className="w-3.5 h-3.5 text-white animate-in zoom-in duration-300" />
                            ) : isIconEmoji ? (
                                <span className="text-sm">{icon}</span>
                            ) : FolderIcon ? (
                                <FolderIcon className="w-3.5 h-3.5" />
                            ) : (
                                <div className={`w-2.5 h-2.5 rounded-full ${color.dot}`} />
                            )}
                            
                            <span className="truncate max-w-[120px]">{folder.name}</span>
                            
                            <span className={`
                                text-[10px] font-black px-2 py-0.5 rounded-full ml-1
                                ${isEmpty
                                    ? 'bg-gray-100 text-gray-300'
                                    : isSelected
                                        ? 'bg-white/20 text-white'
                                        : `${color.bg} ${color.text}`
                                }
                            `}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Summary Message */}
            <div className={`mt-6 overflow-hidden transition-all duration-500 ${!isAllSelected ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className={`flex items-center gap-3 p-4 rounded-2xl border ${selectedWordCount > 0 ? 'bg-blue-50/50 border-blue-100 text-blue-700' : 'bg-orange-50/50 border-orange-100 text-orange-700'}`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${selectedWordCount > 0 ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                        <Sparkles className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-semibold leading-relaxed">
                        {selectedWordCount > 0 ? (
                            <>선택한 폴더의 <span className="text-sm font-black underline underline-offset-4 decoration-blue-200">{selectedWordCount}개</span> 단어로 학습을 시작합니다!</>
                        ) : (
                            <>선택된 폴더에 단어가 없습니다. 다른 폴더를 추가로 선택해 주세요.</>
                        )}
                    </p>
                </div>
            </div>
        </div>
    );
}
