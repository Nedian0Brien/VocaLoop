import React, { useRef, useState, useEffect } from 'react';
import { 
    Folder, FolderOpen, ChevronLeft, ChevronRight, Plus, X, Check, Sparkles, AlertCircle, Trash2, Edit3,
    BookOpen, Brain, Trophy, Target, FileText, TrendingUp, Shield, Star, Heart, Smile
} from './Icons';

const FOLDER_COLORS = [
    { name: 'blue', bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200', dot: 'bg-blue-500', activeBg: 'bg-blue-600', ring: 'ring-blue-500' },
    { name: 'purple', bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200', dot: 'bg-purple-500', activeBg: 'bg-purple-600', ring: 'ring-purple-500' },
    { name: 'green', bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200', dot: 'bg-green-500', activeBg: 'bg-green-600', ring: 'ring-green-500' },
    { name: 'orange', bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200', dot: 'bg-orange-500', activeBg: 'bg-orange-600', ring: 'ring-orange-500' },
    { name: 'pink', bg: 'bg-pink-100', text: 'text-pink-600', border: 'border-pink-200', dot: 'bg-pink-500', activeBg: 'bg-pink-600', ring: 'ring-pink-500' },
    { name: 'teal', bg: 'bg-teal-100', text: 'text-teal-600', border: 'border-teal-200', dot: 'bg-teal-500', activeBg: 'bg-teal-600', ring: 'ring-teal-500' },
];

const FOLDER_ICONS = [
    { id: 'book', component: BookOpen },
    { id: 'brain', component: Brain },
    { id: 'trophy', component: Trophy },
    { id: 'target', component: Target },
    { id: 'sparkles', component: Sparkles },
    { id: 'file', component: FileText },
    { id: 'trend', component: TrendingUp },
    { id: 'shield', component: Shield },
];

const getColorClasses = (colorName) => {
    return FOLDER_COLORS.find(c => c.name === colorName) || FOLDER_COLORS[0];
};

const getIconComponent = (iconId) => {
    const icon = FOLDER_ICONS.find(i => i.id === iconId);
    return icon ? icon.component : null;
};

const isEmoji = (str) => {
    if (!str) return false;
    const emojiRegex = /\p{Emoji}/u;
    return emojiRegex.test(str);
};

export default function CompactFolderPicker({
    folders,
    selectedFolderId,
    selectedFolderIds = [], // Multi-select support
    onSelectFolder,
    onCreateFolder,
    onUpdateFolder,
    onDeleteFolder,
    wordCountByFolder,
    totalWordCount,
    isMultiSelect = false // Toggle for quiz config mode
}) {
    const scrollRef = useRef(null);
    const inputRef = useRef(null);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(true);
    
    const [isCreating, setIsCreating] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [newFolderColor, setNewFolderColor] = useState('blue');
    const [newFolderIcon, setNewFolderIcon] = useState(null);
    const [customEmoji, setCustomEmoji] = useState('');
    const [error, setError] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    const [managingFolder, setManagingFolder] = useState(null);
    const [editName, setEditName] = useState('');
    const [editColor, setEditColor] = useState('blue');
    const [editIcon, setEditIcon] = useState(null);
    const [editCustomEmoji, setEditCustomEmoji] = useState('');
    
    const longPressTimer = useRef(null);
    const isLongPressActive = useRef(false);

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
            setError('');
            setIsSuccess(false);
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
        const isDuplicate = folders.some(f => f.name.toLowerCase() === trimmed.toLowerCase());
        if (isDuplicate) {
            setError('이미 존재하는 폴더 이름입니다.');
            return;
        }
        setError('');
        setIsSuccess(true);
        const iconToSave = customEmoji.trim() || newFolderIcon;
        setTimeout(() => {
            onCreateFolder(trimmed, newFolderColor, iconToSave);
            setIsCreating(false);
            setNewFolderName('');
            setNewFolderColor('blue');
            setNewFolderIcon(null);
            setCustomEmoji('');
            setIsSuccess(false);
        }, 800);
    };

    const handleTouchStart = (folder) => {
        if (isMultiSelect) return;
        isLongPressActive.current = false;
        longPressTimer.current = setTimeout(() => {
            isLongPressActive.current = true;
            if (window.navigator.vibrate) window.navigator.vibrate(50);
            setManagingFolder(folder.id);
            setEditName(folder.name);
            setEditColor(folder.color || 'blue');
            const icon = folder.icon;
            if (icon && isEmoji(icon)) {
                setEditCustomEmoji(icon);
                setEditIcon(null);
            } else {
                setEditIcon(icon || null);
                setEditCustomEmoji('');
            }
        }, 600);
    };

    const handleTouchEnd = (e, folderId) => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
        if (!isLongPressActive.current) {
            onSelectFolder(folderId);
        }
    };

    const handleUpdateFolder = () => {
        const trimmed = editName.trim();
        if (!trimmed) return;
        const currentFolder = folders.find(f => f.id === managingFolder);
        if (trimmed !== currentFolder.name) {
            const isDuplicate = folders.some(f => f.name.toLowerCase() === trimmed.toLowerCase() && f.id !== managingFolder);
            if (isDuplicate) {
                alert('이미 존재하는 폴더 이름입니다.');
                return;
            }
        }
        const iconToUpdate = editCustomEmoji.trim() || editIcon;
        onUpdateFolder(managingFolder, trimmed, editColor, iconToUpdate);
        setManagingFolder(null);
    };

    const handleDeleteClick = () => {
        if (window.confirm('이 폴더를 삭제하시겠습니까? 폴더 안의 단어는 미분류로 이동합니다.')) {
            onDeleteFolder(managingFolder);
            setManagingFolder(null);
        }
    };

    const renderIconSelector = (selectedIcon, setSelectedIcon, activeEmoji, setEmoji, activeColor) => (
        <div className="space-y-3 mb-4">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 px-2 -mx-2">
                <button
                    onClick={() => { setSelectedIcon(null); setEmoji(''); }}
                    className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all border ${
                        selectedIcon === null && !activeEmoji
                            ? `bg-gray-100 border-gray-300 text-gray-900 ring-2 ring-offset-2 ring-gray-400` 
                            : 'bg-gray-50 border-gray-100 text-gray-400 hover:bg-gray-100'
                    }`}
                >
                    <X className="w-4 h-4" />
                </button>
                {FOLDER_ICONS.map((icon) => {
                    const IconComp = icon.component;
                    const isSelected = selectedIcon === icon.id && !activeEmoji;
                    return (
                        <button
                            key={icon.id}
                            onClick={() => { setSelectedIcon(icon.id); setEmoji(''); }}
                            className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                                isSelected 
                                    ? `${getColorClasses(activeColor).bg} ${getColorClasses(activeColor).text} ring-2 ${getColorClasses(activeColor).ring} ring-offset-2 scale-110` 
                                    : 'bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                            }`}
                        >
                            <IconComp className="w-5 h-5" />
                        </button>
                    );
                })}
            </div>
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <input
                        type="text"
                        value={activeEmoji}
                        onChange={(e) => {
                            setEmoji(e.target.value);
                            if (e.target.value) setSelectedIcon(null);
                        }}
                        placeholder="이모지 직접 입력 (예: 🍎)"
                        className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                        maxLength={5}
                    />
                    <Smile className="absolute right-2.5 top-2 w-3.5 h-3.5 text-gray-400" />
                </div>
            </div>
        </div>
    );

    return (
        <div className="relative group -mx-4 overflow-hidden">
            {/* Create Folder Overlay */}
            {isCreating && (
                <div className="absolute inset-x-4 top-0 z-30 animate-in zoom-in-95 duration-200 origin-top">
                    <div className="bg-white rounded-3xl shadow-2xl border border-blue-100 p-5 mb-4 ring-1 ring-black/5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                                    <Plus className="w-4 h-4 text-blue-600" />
                                </div>
                                <h3 className="text-sm font-bold text-gray-900">새 폴더 만들기</h3>
                            </div>
                            <button onClick={() => setIsCreating(false)} className="p-2 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                        </div>
                        <input
                            ref={inputRef}
                            type="text"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            placeholder="폴더 이름을 입력하세요"
                            className={`w-full text-sm px-3 py-2.5 border rounded-xl mb-4 ${error ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}
                        />
                        {error && <p className="text-red-500 text-[10px] font-bold mb-2">{error}</p>}
                        <p className="text-[11px] font-bold text-gray-400 uppercase mb-2 ml-1">색상 & 아이콘</p>
                        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-2 px-2 -mx-2 mb-4">
                            {FOLDER_COLORS.map((c) => (
                                <button
                                    key={c.name}
                                    onClick={() => setNewFolderColor(c.name)}
                                    className={`flex-shrink-0 w-6 h-6 rounded-full ${c.dot} transition-all ${newFolderColor === c.name ? `ring-2 ring-offset-2 ${c.ring} scale-110` : 'opacity-60'}`}
                                />
                            ))}
                        </div>
                        {renderIconSelector(newFolderIcon, setNewFolderIcon, customEmoji, setCustomEmoji, newFolderColor)}
                        <button
                            onClick={handleCreateSubmit}
                            disabled={!newFolderName.trim() || isSuccess}
                            className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all ${isSuccess ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                        >
                            {isSuccess ? 'Success!' : '폴더 생성'}
                        </button>
                    </div>
                </div>
            )}

            {/* Manage Folder Overlay */}
            {managingFolder && (
                <div className="absolute inset-x-4 top-0 z-30 animate-in zoom-in-95 duration-200 origin-top">
                    <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-5 mb-4">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"><Edit3 className="w-4 h-4 text-gray-600" /></div>
                                <h3 className="text-sm font-bold text-gray-900">폴더 관리</h3>
                            </div>
                            <button onClick={() => setManagingFolder(null)} className="p-2 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                        </div>
                        <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="폴더 이름"
                            className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-xl mb-4 bg-gray-50"
                        />
                        <p className="text-[11px] font-bold text-gray-400 uppercase mb-2">색상 & 아이콘 변경</p>
                        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-2 px-2 -mx-2 mb-4">
                            {FOLDER_COLORS.map((c) => (
                                <button
                                    key={c.name}
                                    onClick={() => setEditColor(c.name)}
                                    className={`flex-shrink-0 w-6 h-6 rounded-full ${c.dot} transition-all ${editColor === c.name ? `ring-2 ring-offset-2 ${c.ring} scale-110` : 'opacity-60'}`}
                                />
                            ))}
                        </div>
                        {renderIconSelector(editIcon, setEditIcon, editCustomEmoji, setEditCustomEmoji, editColor)}
                        <div className="flex gap-2">
                            <button onClick={handleDeleteClick} className="flex-1 py-2 rounded-xl text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors">삭제</button>
                            <button onClick={handleUpdateFolder} disabled={!editName.trim()} className="flex-1 py-2 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700">수정 완료</button>
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
                className={`px-4 overflow-x-auto no-scrollbar flex items-center gap-2 pb-2 scroll-smooth transition-opacity duration-200 ${(isCreating || managingFolder) ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}
            >
                {!isMultiSelect && (
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
                )}

                {/* Add Folder Button (Only in normal mode) */}
                {!isMultiSelect && (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-blue-600 transition-all border border-gray-200"
                        title="새 폴더 추가"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                )}

                {folders.map((folder) => {
                    const isSelected = isMultiSelect 
                        ? selectedFolderIds.includes(folder.id) 
                        : selectedFolderId === folder.id;
                    const count = wordCountByFolder[folder.id] || 0;
                    const color = getColorClasses(folder.color);
                    
                    const icon = folder.icon;
                    const isIconEmoji = isEmoji(icon);
                    const FolderIcon = !isIconEmoji ? getIconComponent(icon) : null;
                    
                    return (
                        <button
                            key={folder.id}
                            onMouseDown={() => handleTouchStart(folder)}
                            onMouseUp={(e) => isMultiSelect ? onSelectFolder(folder.id) : handleTouchEnd(e, folder.id)}
                            onMouseLeave={() => {
                                if (longPressTimer.current) {
                                    clearTimeout(longPressTimer.current);
                                    longPressTimer.current = null;
                                }
                            }}
                            onTouchStart={() => handleTouchStart(folder)}
                            onTouchEnd={(e) => isMultiSelect ? onSelectFolder(folder.id) : handleTouchEnd(e, folder.id)}
                            onContextMenu={(e) => e.preventDefault()}
                            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all border select-none ${
                                isSelected
                                    ? `${color.activeBg} text-white shadow-lg border-transparent scale-105`
                                    : `bg-white border-slate-200 text-slate-600 hover:bg-slate-50`
                            }`}
                        >
                            {isIconEmoji ? (
                                <span className="text-sm">{icon}</span>
                            ) : FolderIcon ? (
                                <FolderIcon className="w-3.5 h-3.5" />
                            ) : (
                                <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : color.dot}`} />
                            )}
                            <span className="max-w-[120px] truncate">{folder.name}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'
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
