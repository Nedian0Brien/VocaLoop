import React, { useRef, useState, useEffect } from 'react';
import { Folder, FolderOpen, ChevronLeft, ChevronRight, Plus, X, Check, Sparkles, AlertCircle, Trash2, Edit3, ArrowRightLeft } from './Icons';

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

export default function CompactFolderPicker({
    folders,
    selectedFolderId,
    onSelectFolder,
    onCreateFolder,
    onUpdateFolder,
    onDeleteFolder,
    onReorderFolders,
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
    const [error, setError] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    // Manage Folder (Edit/Delete) State
    const [managingFolder, setManagingFolder] = useState(null); // id
    const [editName, setEditName] = useState('');
    const [editColor, setEditColor] = useState('blue');
    
    // Drag & Drop / Long Press State
    const [draggedFolderId, setDraggedFolderId] = useState(null);
    const [isReordering, setIsReordering] = useState(false);
    const longPressTimer = useRef(null);
    const dragStarted = useRef(false);

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
        
        setTimeout(() => {
            onCreateFolder(trimmed, newFolderColor);
            setIsCreating(false);
            setNewFolderName('');
            setNewFolderColor('blue');
            setIsSuccess(false);
        }, 800);
    };

    // --- Long Press & Drag Handlers ---
    const handleTouchStart = (folder) => {
        dragStarted.current = false;
        longPressTimer.current = setTimeout(() => {
            if (window.navigator.vibrate) window.navigator.vibrate(50);
            
            // 롱 프레스 시 관리 모달을 여는 대신 '순서 변경 모드' 또는 '관리 선택' 유도
            // 사용자 요청: "롱 프레스 후 드래그로 순서 변경"
            // 따라서 롱 프레스 시 드래그 모드 활성화
            setDraggedFolderId(folder.id);
            setIsReordering(true);
            dragStarted.current = true;
        }, 600);
    };

    const handleTouchEnd = (folder) => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }

        // 드래그가 시작되지 않은 상태에서 뗀 경우 (단순 클릭) -> 관리 모달 열기 고려?
        // 사용자 피드백 반영: 롱 프레스만 하면 관리 모달, 드래그하면 순서 변경
        if (!dragStarted.current && !isReordering) {
            // 단순 클릭은 App에서 처리되지만, 여기서 관리 모달을 열고 싶다면:
            // if (isLongPressed) setManagingFolder(folder.id)...
        } else if (isReordering) {
            // 순서 변경 종료
            setIsReordering(false);
            setDraggedFolderId(null);
        }
    };

    // 관리 모달 열기 (기존 롱 프레스 로직 유지하되 드래그와 분리)
    const openManageModal = (folder) => {
        setManagingFolder(folder.id);
        setEditName(folder.name);
        setEditColor(folder.color || 'blue');
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

        onUpdateFolder(managingFolder, trimmed, editColor);
        setManagingFolder(null);
    };

    const handleDeleteClick = () => {
        if (window.confirm('이 폴더를 삭제하시겠습니까? 폴더 안의 단어는 미분류로 이동합니다.')) {
            onDeleteFolder(managingFolder);
            setManagingFolder(null);
        }
    };

    // Drag & Drop Logic
    const onDragOver = (e, targetFolderId) => {
        e.preventDefault();
        if (!draggedFolderId || draggedFolderId === targetFolderId) return;

        const draggedIndex = folders.findIndex(f => f.id === draggedFolderId);
        const targetIndex = folders.findIndex(f => f.id === targetFolderId);
        
        const newFolders = [...folders];
        const [removed] = newFolders.splice(draggedIndex, 1);
        newFolders.splice(targetIndex, 0, removed);
        
        onReorderFolders(newFolders);
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
                            className={`w-full text-sm px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-2 transition-all mb-1 ${
                                error ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500' : 'border-gray-200 bg-gray-50 focus:ring-blue-500 focus:border-blue-500'
                            }`}
                            maxLength={30}
                            disabled={isSuccess}
                        />
                        
                        {error && (
                            <div className="flex items-center gap-1 mt-1 mb-3 text-red-500 text-[10px] font-bold animate-in fade-in slide-in-from-top-1">
                                <AlertCircle className="w-3 h-3" />
                                {error}
                            </div>
                        )}
                        {!error && <div className="h-5" />}

                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-2 px-2 -mx-2">
                                {FOLDER_COLORS.map((c) => (
                                    <button
                                        key={c.name}
                                        onClick={() => { setNewFolderColor(c.name); setError(''); }}
                                        disabled={isSuccess}
                                        className={`flex-shrink-0 w-6 h-6 rounded-full ${c.dot} transition-all ${
                                            newFolderColor === c.name
                                                ? `ring-2 ring-offset-2 ${c.ring} scale-110`
                                                : 'opacity-60 hover:opacity-100'
                                        }`}
                                    />
                                ))}
                            </div>
                            <button
                                onClick={handleCreateSubmit}
                                disabled={!newFolderName.trim() || isSuccess}
                                className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-500 ${
                                    isSuccess 
                                        ? 'bg-green-500 text-white scale-105 shadow-lg shadow-green-200' 
                                        : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
                                }`}
                            >
                                {isSuccess ? (
                                    <>
                                        <Sparkles className="w-4 h-4 animate-bounce" />
                                        <span>Success!</span>
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-4 h-4" />
                                        <span>생성</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Manage Folder Modal Overlay (Long Press -> Clicked) */}
            {managingFolder && (
                <div className="absolute inset-x-4 top-0 z-30 animate-expand-from-icon" style={{ transformOrigin: '50% 20px' }}>
                    <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-5 mb-4 ring-1 ring-black/5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                    <Edit3 className="w-4 h-4 text-gray-600" />
                                </div>
                                <h3 className="text-sm font-bold text-gray-900">폴더 관리</h3>
                            </div>
                            <button onClick={() => setManagingFolder(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="폴더 이름"
                            className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 bg-gray-50"
                            maxLength={30}
                        />

                        {/* Color Selector in Manage Modal */}
                        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-2 px-2 -mx-2 mb-4">
                            {FOLDER_COLORS.map((c) => (
                                <button
                                    key={c.name}
                                    onClick={() => setEditColor(c.name)}
                                    className={`flex-shrink-0 w-6 h-6 rounded-full ${c.dot} transition-all ${
                                        editColor === c.name
                                            ? `ring-2 ring-offset-2 ${c.ring} scale-110`
                                            : 'opacity-60 hover:opacity-100'
                                    }`}
                                />
                            ))}
                        </div>

                        <div className="flex items-center justify-between gap-2">
                            <button
                                onClick={handleDeleteClick}
                                className="flex items-center gap-1.5 px-4 py-2 text-red-600 bg-red-50 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                                삭제
                            </button>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setManagingFolder(null)}
                                    className="px-4 py-2 text-gray-500 bg-gray-100 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleUpdateFolder}
                                    disabled={!editName.trim()}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md"
                                >
                                    <Check className="w-4 h-4" />
                                    수정
                                </button>
                            </div>
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
                    const isDragged = draggedFolderId === folder.id;
                    const count = wordCountByFolder[folder.id] || 0;
                    const color = getColorClasses(folder.color);
                    
                    return (
                        <button
                            key={folder.id}
                            draggable
                            onDragStart={() => setDraggedFolderId(folder.id)}
                            onDragOver={(e) => onDragOver(e, folder.id)}
                            onDragEnd={() => setDraggedFolderId(null)}
                            onClick={() => {
                                if (!isReordering) onSelectFolder(folder.id);
                            }}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                openManageModal(folder);
                            }}
                            onMouseDown={() => handleTouchStart(folder)}
                            onMouseUp={() => handleTouchEnd(folder)}
                            onMouseLeave={() => handleTouchEnd(folder)}
                            onTouchStart={() => handleTouchStart(folder)}
                            onTouchEnd={() => handleTouchEnd(folder)}
                            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all border select-none ${
                                isSelected
                                    ? `${color.activeBg} text-white shadow-md border-transparent`
                                    : `bg-white border-gray-200 text-gray-600 hover:bg-gray-50`
                            } ${isDragged ? 'opacity-40 scale-95 border-dashed border-blue-400' : ''} ${isReordering ? 'cursor-move animate-pulse' : ''}`}
                        >
                            {isReordering ? (
                                <ArrowRightLeft className="w-3 h-3 opacity-70" />
                            ) : (
                                <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : color.dot}`} />
                            )}
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

            {/* Reorder Mode Indicator */}
            {isReordering && (
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow-sm animate-bounce">
                    순서 변경 중
                </div>
            )}
        </div>
    );
}
