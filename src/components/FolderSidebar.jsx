import React, { useState, useRef, useEffect } from 'react';
import { Folder, FolderPlus, FolderOpen, Trash2, Edit3, Check, X, ChevronDown, ChevronRight, MoreVertical } from './Icons';

const FOLDER_COLORS = [
    { name: 'blue', bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200', dot: 'bg-blue-500' },
    { name: 'purple', bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200', dot: 'bg-purple-500' },
    { name: 'green', bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200', dot: 'bg-green-500' },
    { name: 'orange', bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200', dot: 'bg-orange-500' },
    { name: 'pink', bg: 'bg-pink-100', text: 'text-pink-600', border: 'border-pink-200', dot: 'bg-pink-500' },
    { name: 'teal', bg: 'bg-teal-100', text: 'text-teal-600', border: 'border-teal-200', dot: 'bg-teal-500' },
];

const getColorClasses = (colorName) => {
    return FOLDER_COLORS.find(c => c.name === colorName) || FOLDER_COLORS[0];
};

export default function FolderSidebar({
    folders,
    selectedFolderId,
    onSelectFolder,
    onCreateFolder,
    onUpdateFolder,
    onDeleteFolder,
    wordCountByFolder,
    totalWordCount,
}) {
    const [isCreating, setIsCreating] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [newFolderColor, setNewFolderColor] = useState('blue');
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');
    const [menuOpenId, setMenuOpenId] = useState(null);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const inputRef = useRef(null);
    const editInputRef = useRef(null);
    const menuRef = useRef(null);

    useEffect(() => {
        if (isCreating && inputRef.current) inputRef.current.focus();
    }, [isCreating]);

    useEffect(() => {
        if (editingId && editInputRef.current) editInputRef.current.focus();
    }, [editingId]);

    // Close menu on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuOpenId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleCreate = () => {
        const trimmed = newFolderName.trim();
        if (!trimmed) return;
        onCreateFolder(trimmed, newFolderColor);
        setNewFolderName('');
        setNewFolderColor('blue');
        setIsCreating(false);
    };

    const handleRename = (id) => {
        const trimmed = editName.trim();
        if (!trimmed) return;
        onUpdateFolder(id, trimmed);
        setEditingId(null);
        setEditName('');
    };

    const handleDelete = (id) => {
        if (!window.confirm('이 폴더를 삭제하시겠습니까? 폴더 안의 단어는 삭제되지 않고 미분류로 이동합니다.')) return;
        onDeleteFolder(id);
        setMenuOpenId(null);
        if (selectedFolderId === id) onSelectFolder(null);
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Folder className="w-4.5 h-4.5 text-blue-600" />
                    <span className="text-sm font-bold text-gray-900">단어장 폴더</span>
                    <span className="text-xs text-gray-400 font-medium">({folders.length})</span>
                </div>
                {isCollapsed ? (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
            </button>

            {!isCollapsed && (
                <div className="px-3 pb-3">
                    {/* All Words Button */}
                    <button
                        onClick={() => onSelectFolder(null)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all mb-1 ${
                            selectedFolderId === null
                                ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm'
                                : 'text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <FolderOpen className="w-4 h-4" />
                            <span>전체 단어</span>
                        </div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            selectedFolderId === null ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                        }`}>
                            {totalWordCount}
                        </span>
                    </button>

                    {/* Folder List */}
                    {folders.map((folder) => {
                        const color = getColorClasses(folder.color);
                        const isSelected = selectedFolderId === folder.id;
                        const count = wordCountByFolder[folder.id] || 0;

                        if (editingId === folder.id) {
                            return (
                                <div key={folder.id} className="flex items-center gap-2 px-3 py-2 mb-1">
                                    <input
                                        ref={editInputRef}
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleRename(folder.id);
                                            if (e.key === 'Escape') { setEditingId(null); setEditName(''); }
                                        }}
                                        className="flex-1 text-sm px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                                        maxLength={30}
                                    />
                                    <button onClick={() => handleRename(folder.id)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                                        <Check className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => { setEditingId(null); setEditName(''); }} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            );
                        }

                        return (
                            <div key={folder.id} className="relative group mb-1">
                                <button
                                    onClick={() => onSelectFolder(folder.id)}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all ${
                                        isSelected
                                            ? `${color.bg} ${color.text} font-semibold shadow-sm`
                                            : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2.5 h-2.5 rounded-full ${color.dot}`} />
                                        <span className="truncate max-w-[140px]">{folder.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                            isSelected ? `${color.bg} ${color.text}` : 'bg-gray-100 text-gray-500'
                                        }`}>
                                            {count}
                                        </span>
                                    </div>
                                </button>

                                {/* Context Menu Trigger */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setMenuOpenId(menuOpenId === folder.id ? null : folder.id);
                                    }}
                                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-gray-200 hover:text-gray-600 transition-all"
                                >
                                    <MoreVertical className="w-3.5 h-3.5" />
                                </button>

                                {/* Context Menu */}
                                {menuOpenId === folder.id && (
                                    <div
                                        ref={menuRef}
                                        className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[140px] animate-in fade-in zoom-in-95 duration-150"
                                    >
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingId(folder.id);
                                                setEditName(folder.name);
                                                setMenuOpenId(null);
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                        >
                                            <Edit3 className="w-3.5 h-3.5" />
                                            이름 변경
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(folder.id);
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            삭제
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Create New Folder */}
                    {isCreating ? (
                        <div className="mt-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
                            <input
                                ref={inputRef}
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCreate();
                                    if (e.key === 'Escape') { setIsCreating(false); setNewFolderName(''); }
                                }}
                                placeholder="폴더 이름"
                                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 mb-2"
                                maxLength={30}
                            />
                            <div className="flex items-center gap-1.5 mb-3">
                                {FOLDER_COLORS.map((c) => (
                                    <button
                                        key={c.name}
                                        onClick={() => setNewFolderColor(c.name)}
                                        className={`w-6 h-6 rounded-full ${c.dot} transition-all ${
                                            newFolderColor === c.name
                                                ? 'ring-2 ring-offset-2 ring-gray-400 scale-110'
                                                : 'opacity-60 hover:opacity-100'
                                        }`}
                                    />
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCreate}
                                    disabled={!newFolderName.trim()}
                                    className="flex-1 text-sm py-1.5 px-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    생성
                                </button>
                                <button
                                    onClick={() => { setIsCreating(false); setNewFolderName(''); }}
                                    className="text-sm py-1.5 px-3 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    취소
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsCreating(true)}
                            className="w-full flex items-center gap-2 px-3 py-2.5 mt-1 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-blue-600 transition-all border border-dashed border-gray-300 hover:border-blue-300"
                        >
                            <FolderPlus className="w-4 h-4" />
                            새 폴더 만들기
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
