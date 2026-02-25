import React, { useRef, useState, useEffect } from 'react';
import { Folder, FolderOpen, ChevronLeft, ChevronRight, Plus, X, Check } from './Icons';

const FOLDER_COLORS = [
    { name: 'blue', bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200', dot: 'bg-blue-500', activeBg: 'bg-blue-600' },
    { name: 'purple', bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200', dot: 'bg-purple-500', activeBg: 'bg-purple-600' },
    { name: 'green', bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200', dot: 'bg-green-500', activeBg: 'bg-green-600' },
    { name: 'orange', bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200', dot: 'bg-orange-500', activeBg: 'bg-orange-600' },
    { name: 'pink', bg: 'bg-pink-100', text: 'text-pink-600', border: 'border-pink-200', dot: 'bg-pink-500', activeBg: 'bg-pink-600' },
    { name: 'teal', bg: 'bg-teal-100', text: 'text-teal-600', border: 'border-teal-200', dot: 'bg-teal-500', activeBg: 'bg-teal-600' },
];

const getColorClasses = (colorName) => {
    return FOLDER_COLORS.find(c => c.name === colorName) || FOLDER_COLORS[0];
};

export default function CompactFolderPicker({
    folders,
    selectedFolderId,
    onSelectFolder,
    onCreateFolder,
    wordCountByFolder,
    totalWordCount
}) {
    const scrollRef = useRef(null);
    const inputRef = useRef(null);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(true);
    
    // Create Folder Modal State
    const [isCreating, setIsCreating] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [newFolderColor, setNewFolderColor] = useState('blue');

    const checkScroll = () => {
        if (!scrollRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        setShowLeftArrow(scrollLeft > 10);
        setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    };

    useEffect(() => {
        checkScroll();
        window.addEventListener('resize', checkScroll);
        return () => window.removeEventListener('resize', checkScroll);
    }, [folders]);

    useEffect(() => {
        if (isCreating && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isCreating]);

    const scroll = (direction) => {
        if (!scrollRef.current) return;
        const scrollAmount = 200;
        scrollRef.current.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth'
        });
    };

    const handleCreateSubmit = () => {
        const trimmed = newFolderName.trim();
        if (!trimmed) return;
        onCreateFolder(trimmed, newFolderColor);
        setIsCreating(false);
        setNewFolderName('');
        setNewFolderColor('blue');
    };

    return (
        <div className="relative group mb-6 -mx-4">
            {/* Create Folder Modal Overlay */}
            {isCreating && (
                <div 
                    className="absolute inset-x-4 top-0 z-30 animate-expand-from-icon"
                    style={{ transformOrigin: '80px 20px' }}
                >
                    <div className="bg-white rounded-3xl shadow-2xl border border-blue-100 p-5 mb-4 ring-1 ring-black/5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                                    <Plus className="w-4 h-4 text-blue-600" />
                                </div>
                                <h3 className="text-sm font-bold text-gray-900">새 폴더 만들기</h3>
                            </div>
                            <button 
                                onClick={() => setIsCreating(false)} 
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        
                        <input
                            ref={inputRef}
                            type="text"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleCreateSubmit();
                                if (e.key === 'Escape') setIsCreating(false);
                            }}
                            placeholder="폴더 이름을 입력하세요"
                            className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4 bg-gray-50"
                            maxLength={30}
                        />

                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-2 px-2 -mx-2">
                                {FOLDER_COLORS.map((c) => (
                                    <button
                                        key={c.name}
                                        onClick={() => setNewFolderColor(c.name)}
                                        className={`flex-shrink-0 w-6 h-6 rounded-full ${c.dot} transition-all ${
                                            newFolderColor === c.name
                                                ? 'ring-2 ring-offset-2 ring-blue-500 scale-110'
                                                : 'opacity-60 hover:opacity-100'
                                        }`}
                                    />
                                ))}
                            </div>
                            <button
                                onClick={handleCreateSubmit}
                                disabled={!newFolderName.trim()}
                                className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <Check className="w-4 h-4" />
                                생성
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Left Arrow */}
            {showLeftArrow && (
                <button
                    onClick={(e) => { e.stopPropagation(); scroll('left'); }}
                    className="absolute left-0 top-0 bottom-2 w-12 z-20 flex items-center justify-start pl-1 bg-gradient-to-r from-white via-white/70 to-transparent text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <div className="p-1.5 rounded-full bg-white shadow-md border border-gray-100 hover:text-blue-600 hover:scale-110 transition-transform">
                        <ChevronLeft className="w-4 h-4" />
                    </div>
                </button>
            )}

            {/* Scroll Container */}
            <div 
                ref={scrollRef}
                onScroll={checkScroll}
                className={`px-4 overflow-x-auto no-scrollbar flex items-center gap-2 pb-2 scroll-smooth transition-opacity duration-200 ${isCreating ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}
            >
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

                {/* Add Folder Button */}
                <button
                    onClick={() => setIsCreating(true)}
                    className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-blue-600 transition-all border border-gray-200"
                    title="새 폴더 추가"
                >
                    <Plus className="w-5 h-5" />
                </button>

                {folders.map((folder) => {
                    const isSelected = selectedFolderId === folder.id;
                    const count = wordCountByFolder[folder.id] || 0;
                    const color = getColorClasses(folder.color);
                    
                    return (
                        <button
                            key={folder.id}
                            onClick={() => onSelectFolder(folder.id)}
                            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                                isSelected
                                    ? `${color.activeBg} text-white shadow-md border-transparent`
                                    : `bg-white border-gray-200 text-gray-600 hover:bg-gray-50`
                            }`}
                        >
                            <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : color.dot}`} />
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

            {/* Right Arrow */}
            {showRightArrow && (
                <button
                    onClick={(e) => { e.stopPropagation(); scroll('right'); }}
                    className="absolute right-0 top-0 bottom-2 w-12 z-20 flex items-center justify-end pr-1 bg-gradient-to-l from-white via-white/70 to-transparent text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <div className="p-1.5 rounded-full bg-white shadow-md border border-gray-100 hover:text-blue-600 hover:scale-110 transition-transform">
                        <ChevronRight className="w-4 h-4" />
                    </div>
                </button>
            )}
        </div>
    );
}
