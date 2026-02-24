import React from 'react';
import { Folder, FolderOpen } from './Icons';

export default function CompactFolderPicker({
    folders,
    selectedFolderId,
    onSelectFolder,
    wordCountByFolder,
    totalWordCount
}) {
    return (
        <div className="mb-6 -mx-4 px-4 overflow-x-auto no-scrollbar flex items-center gap-2 pb-2">
            <button
                onClick={() => onSelectFolder(null)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedFolderId === null
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
            >
                <FolderOpen className={`w-3.5 h-3.5 ${selectedFolderId === null ? 'text-white' : 'text-blue-500'}`} />
                <span>전체</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    selectedFolderId === null ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                    {totalWordCount}
                </span>
            </button>

            {folders.map((folder) => {
                const isSelected = selectedFolderId === folder.id;
                const count = wordCountByFolder[folder.id] || 0;
                
                return (
                    <button
                        key={folder.id}
                        onClick={() => onSelectFolder(folder.id)}
                        className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                            isSelected
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-400'}`} />
                        <span className="max-w-[100px] truncate">{folder.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                        }`}>
                            {count}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
