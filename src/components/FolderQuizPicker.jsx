import React from 'react';
import { Folder, FolderOpen, BookOpen, Check } from './Icons';

const FOLDER_COLOR_MAP = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', activeBg: 'bg-blue-600', dot: 'bg-blue-500' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300', activeBg: 'bg-purple-600', dot: 'bg-purple-500' },
    green: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', activeBg: 'bg-green-600', dot: 'bg-green-500' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', activeBg: 'bg-orange-600', dot: 'bg-orange-500' },
    pink: { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-300', activeBg: 'bg-pink-600', dot: 'bg-pink-500' },
    teal: { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-300', activeBg: 'bg-teal-600', dot: 'bg-teal-500' },
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

    // 선택된 폴더들의 총 단어 수
    const selectedWordCount = isAllSelected
        ? totalCount
        : quizFolderIds.reduce((sum, id) => sum + (folderCounts[id] || 0), 0);

    // 선택된 폴더 이름 목록
    const selectedFolderNames = quizFolderIds
        .map(id => folders.find(f => f.id === id)?.name)
        .filter(Boolean);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Folder className="w-4.5 h-4.5 text-blue-600" />
                    <h3 className="text-sm font-bold text-gray-900">폴더별 출제 범위</h3>
                </div>
                {!isAllSelected && (
                    <span className="text-xs text-gray-500">
                        {quizFolderIds.length}개 폴더 선택됨
                    </span>
                )}
            </div>

            <div className="flex flex-wrap gap-2">
                {/* 전체 단어 칩 */}
                <button
                    onClick={() => onToggleFolder(null)}
                    className={`
                        group flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
                        transition-all duration-200 border-2
                        ${isAllSelected
                            ? 'bg-gray-900 text-white border-gray-900 shadow-md shadow-gray-900/20'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                        }
                    `}
                >
                    <FolderOpen className={`w-4 h-4 ${isAllSelected ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}`} />
                    <span>전체 단어</span>
                    <span className={`
                        text-xs font-bold px-1.5 py-0.5 rounded-md ml-0.5
                        ${isAllSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}
                    `}>
                        {totalCount}
                    </span>
                </button>

                {/* 각 폴더 칩 - 토글 방식 */}
                {folders.map(folder => {
                    const color = FOLDER_COLOR_MAP[folder.color] || FOLDER_COLOR_MAP.blue;
                    const count = folderCounts[folder.id] || 0;
                    const isSelected = quizFolderIds.includes(folder.id);
                    const isEmpty = count === 0;

                    return (
                        <button
                            key={folder.id}
                            onClick={() => onToggleFolder(folder.id)}
                            disabled={isEmpty}
                            className={`
                                group flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
                                transition-all duration-200 border-2
                                ${isEmpty
                                    ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                                    : isSelected
                                        ? `${color.activeBg} text-white border-transparent shadow-md`
                                        : `bg-white ${color.text} ${color.border} hover:shadow-sm hover:-translate-y-0.5`
                                }
                            `}
                        >
                            {isSelected ? (
                                <Check className="w-3.5 h-3.5 text-white" />
                            ) : (
                                <div className={`w-2.5 h-2.5 rounded-full ${isEmpty ? 'bg-gray-300' : color.dot}`} />
                            )}
                            <span className="truncate max-w-[120px]">{folder.name}</span>
                            <span className={`
                                text-xs font-bold px-1.5 py-0.5 rounded-md ml-0.5
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

            {/* 선택된 폴더 요약 정보 */}
            {!isAllSelected && selectedWordCount > 0 && (
                <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 text-blue-700">
                    <BookOpen className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-medium">
                        <strong>{selectedFolderNames.join(', ')}</strong>
                        {' '}폴더의 총 <strong>{selectedWordCount}</strong>개 단어로 퀴즈가 출제됩니다.
                    </span>
                </div>
            )}
            {!isAllSelected && selectedWordCount === 0 && (
                <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-50 text-orange-700">
                    <BookOpen className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-medium">
                        선택된 폴더에 단어가 없습니다. 다른 폴더를 선택하거나 전체 단어로 전환해주세요.
                    </span>
                </div>
            )}
        </div>
    );
}
