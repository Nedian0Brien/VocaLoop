import React, { useState, useRef, useEffect } from 'react';
import {
    Folder, FolderPlus, FolderOpen, Trash2, Edit3, Check, X, ChevronDown, ChevronRight, MoreVertical,
    BookOpen, Brain, Trophy, Target, Sparkles, FileText, TrendingUp, Shield,
} from './Icons';
import { Button } from '../design-system';

/**
 * 폴더 색상 팔레트 — 사용자 데이터.
 * 디자인 시스템 brand/accent와 별개로 raw Tailwind 유지.
 */
const FOLDER_COLORS = [
    { name: 'blue',   bg: 'bg-blue-100',   text: 'text-blue-600',   border: 'border-blue-200',   dot: 'bg-blue-500' },
    { name: 'purple', bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200', dot: 'bg-purple-500' },
    { name: 'green',  bg: 'bg-green-100',  text: 'text-green-600',  border: 'border-green-200',  dot: 'bg-green-500' },
    { name: 'orange', bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200', dot: 'bg-orange-500' },
    { name: 'pink',   bg: 'bg-pink-100',   text: 'text-pink-600',   border: 'border-pink-200',   dot: 'bg-pink-500' },
    { name: 'teal',   bg: 'bg-teal-100',   text: 'text-teal-600',   border: 'border-teal-200',   dot: 'bg-teal-500' },
];

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

const getColorClasses = (colorName) =>
    FOLDER_COLORS.find(c => c.name === colorName) || FOLDER_COLORS[0];

const getIconComponent = (iconId) => {
    const icon = FOLDER_ICONS.find(i => i.id === iconId);
    return icon ? icon.component : null;
};

const isEmoji = (str) => Boolean(str) && /\p{Emoji}/u.test(str);

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

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpenId(null);
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
        onDeleteFolder(id);
        setMenuOpenId(null);
        if (selectedFolderId === id) onSelectFolder(null);
    };

    return (
        <div className="bg-white rounded-xl shadow-[var(--shadow-soft)] border border-surface-200 mb-6 overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-surface-50 transition-colors"
                aria-expanded={!isCollapsed}
            >
                <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4 text-brand-600" aria-hidden="true" />
                    <span className="text-sm font-black text-surface-900 tracking-tight">단어장 폴더</span>
                    <span className="text-xs text-surface-400 font-bold">({folders.length})</span>
                </div>
                {isCollapsed ? (
                    <ChevronRight className="w-4 h-4 text-surface-400" aria-hidden="true" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-surface-400" aria-hidden="true" />
                )}
            </button>

            {!isCollapsed && (
                <div className="px-3 pb-3">
                    {/* All Words */}
                    <button
                        onClick={() => onSelectFolder(null)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm transition-all mb-1 ${
                            selectedFolderId === null
                                ? 'bg-brand-50 text-brand-700 font-black shadow-[var(--shadow-soft)]'
                                : 'text-surface-600 hover:bg-surface-50'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <FolderOpen className="w-4 h-4" aria-hidden="true" />
                            <span>전체 단어</span>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-pill ${
                            selectedFolderId === null ? 'bg-brand-100 text-brand-600' : 'bg-surface-100 text-surface-500'
                        }`}>
                            {totalWordCount}
                        </span>
                    </button>

                    {/* Folder list */}
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
                                        className="flex-1 text-sm px-2 py-1.5 border border-surface-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-400"
                                        maxLength={30}
                                    />
                                    <button
                                        onClick={() => handleRename(folder.id)}
                                        className="p-1 text-success-600 hover:bg-success-50 rounded"
                                        aria-label="이름 변경 저장"
                                    >
                                        <Check className="w-4 h-4" aria-hidden="true" />
                                    </button>
                                    <button
                                        onClick={() => { setEditingId(null); setEditName(''); }}
                                        className="p-1 text-surface-400 hover:bg-surface-100 rounded"
                                        aria-label="취소"
                                    >
                                        <X className="w-4 h-4" aria-hidden="true" />
                                    </button>
                                </div>
                            );
                        }

                        return (
                            <div key={folder.id} className="relative group mb-1">
                                <button
                                    onClick={() => onSelectFolder(folder.id)}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm transition-all ${
                                        isSelected
                                            ? `${color.bg} ${color.text} font-black shadow-[var(--shadow-soft)]`
                                            : 'text-surface-600 hover:bg-surface-50'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        {isEmoji(folder.icon) ? (
                                            <span className="text-sm w-3.5 h-3.5 flex items-center justify-center">{folder.icon}</span>
                                        ) : folder.icon && getIconComponent(folder.icon) ? (
                                            React.createElement(getIconComponent(folder.icon), { className: 'w-3.5 h-3.5', 'aria-hidden': true })
                                        ) : (
                                            <div className={`w-2.5 h-2.5 rounded-pill ${color.dot}`} aria-hidden="true" />
                                        )}
                                        <span className="truncate max-w-[140px]">{folder.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-pill ${
                                            isSelected ? `${color.bg} ${color.text}` : 'bg-surface-100 text-surface-500'
                                        }`}>
                                            {count}
                                        </span>
                                    </div>
                                </button>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setMenuOpenId(menuOpenId === folder.id ? null : folder.id);
                                    }}
                                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-sm text-surface-400 opacity-0 group-hover:opacity-100 hover:bg-surface-200 hover:text-surface-600 transition-all"
                                    aria-label="폴더 메뉴"
                                >
                                    <MoreVertical className="w-3.5 h-3.5" aria-hidden="true" />
                                </button>

                                {menuOpenId === folder.id && (
                                    <div
                                        ref={menuRef}
                                        className="absolute right-0 top-full mt-1 z-20 bg-white border border-surface-200 rounded-xl shadow-[var(--shadow-elevated)] py-1 min-w-[140px] animate-in fade-in zoom-in-95 duration-150"
                                    >
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingId(folder.id);
                                                setEditName(folder.name);
                                                setMenuOpenId(null);
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-700 hover:bg-surface-50 transition-colors"
                                        >
                                            <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                                            이름 변경
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(folder.id); }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger-600 hover:bg-danger-50 transition-colors"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                            삭제
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Create */}
                    {isCreating ? (
                        <div className="mt-2 p-3 bg-surface-50 rounded-xl border border-surface-200">
                            <input
                                ref={inputRef}
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCreate();
                                    if (e.key === 'Escape') { setIsCreating(false); setNewFolderName(''); }
                                }}
                                placeholder="폴더 이름"
                                className="w-full text-sm px-3 py-2 border border-surface-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-400 mb-2"
                                maxLength={30}
                            />
                            <div className="flex items-center gap-1.5 mb-3">
                                {FOLDER_COLORS.map((c) => (
                                    <button
                                        key={c.name}
                                        onClick={() => setNewFolderColor(c.name)}
                                        aria-label={`${c.name} 색상 선택`}
                                        className={`w-6 h-6 rounded-pill ${c.dot} transition-all ${
                                            newFolderColor === c.name
                                                ? 'ring-2 ring-offset-2 ring-surface-400 scale-110'
                                                : 'opacity-60 hover:opacity-100'
                                        }`}
                                    />
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="primary"
                                    size="sm"
                                    fullWidth
                                    disabled={!newFolderName.trim()}
                                    onClick={handleCreate}
                                >
                                    생성
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => { setIsCreating(false); setNewFolderName(''); }}
                                >
                                    취소
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsCreating(true)}
                            className="w-full flex items-center gap-2 px-3 py-2.5 mt-1 rounded-md text-sm text-surface-500 hover:bg-surface-50 hover:text-brand-600 transition-all border border-dashed border-surface-300 hover:border-brand-300"
                        >
                            <FolderPlus className="w-4 h-4" aria-hidden="true" />
                            새 폴더 만들기
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
