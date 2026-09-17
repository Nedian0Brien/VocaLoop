import React, { useEffect, useRef, useState } from 'react';
import { Check, Edit3, MessageSquare, Plus, Trash2, X } from '../Icons';
import { Button } from '../../design-system';

const dateFormatter = new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' });

const formatUpdatedAt = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : dateFormatter.format(date);
};

export const UNTITLED_CONVERSATION = '새 대화';

/**
 * 대화 목록 — 새 대화, 선택, 이름 바꾸기, 삭제.
 * 데스크톱에서는 왼쪽 사이드바, 모바일에서는 드로어 안에 같은 컴포넌트가 들어간다.
 */
export default function AiConversationList({
    activeConversationId,
    conversations,
    disabled = false,
    isLoading = false,
    onDelete,
    onRename,
    onSelect,
    onStartNew,
}) {
    const [editingId, setEditingId] = useState(null);
    const [editTitle, setEditTitle] = useState('');
    const editInputRef = useRef(null);

    useEffect(() => {
        if (editingId !== null) editInputRef.current?.focus();
    }, [editingId]);

    const beginRename = (conversation) => {
        setEditingId(conversation.id);
        setEditTitle(conversation.title || '');
    };

    const commitRename = async () => {
        if (editingId === null) return;
        const trimmed = editTitle.trim();
        if (trimmed) await onRename(editingId, trimmed);
        setEditingId(null);
    };

    const cancelRename = () => setEditingId(null);

    const confirmDelete = (conversation) => {
        const title = conversation.title || UNTITLED_CONVERSATION;
        if (!window.confirm(`'${title}' 대화를 삭제할까요? 대화 안의 카드도 함께 사라집니다.`)) return;
        onDelete(conversation.id);
    };

    const isDraftActive = activeConversationId === null;

    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3">
                <h2 className="text-sm font-black tracking-tight text-surface-800">대화</h2>
                <Button
                    size="sm"
                    variant={isDraftActive ? 'secondary' : 'primary'}
                    leftIcon={Plus}
                    onClick={onStartNew}
                    disabled={disabled || isDraftActive}
                    aria-label="새 대화 시작"
                >
                    새 대화
                </Button>
            </div>

            <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-4" aria-label="대화 목록">
                {isDraftActive && (
                    <li>
                        <div
                            aria-current="true"
                            className="flex items-center gap-2 rounded-sm bg-brand-50 px-3 py-2.5 text-sm font-black text-brand-700"
                        >
                            <MessageSquare className="h-4 w-4 shrink-0" aria-hidden="true" />
                            <span className="truncate">{UNTITLED_CONVERSATION}</span>
                        </div>
                    </li>
                )}

                {isLoading && conversations.length === 0 && (
                    <li className="px-3 py-2.5 text-xs font-semibold text-surface-500">불러오는 중…</li>
                )}

                {!isLoading && conversations.length === 0 && !isDraftActive && (
                    <li className="px-3 py-2.5 text-xs font-semibold text-surface-500">아직 대화가 없습니다.</li>
                )}

                {conversations.map((conversation) => {
                    const isActive = conversation.id === activeConversationId;
                    const isEditing = conversation.id === editingId;
                    const title = conversation.title || UNTITLED_CONVERSATION;

                    if (isEditing) {
                        return (
                            <li key={conversation.id}>
                                <form
                                    className="flex items-center gap-1 rounded-sm bg-surface-50 px-2 py-1.5"
                                    onSubmit={(event) => {
                                        event.preventDefault();
                                        commitRename();
                                    }}
                                >
                                    <input
                                        ref={editInputRef}
                                        type="text"
                                        value={editTitle}
                                        maxLength={80}
                                        onChange={(event) => setEditTitle(event.target.value)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Escape') cancelRename();
                                        }}
                                        aria-label="대화 이름"
                                        className="h-9 min-w-0 flex-1 rounded-sm border border-surface-300 bg-white px-3 text-sm font-bold text-surface-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                    />
                                    <button
                                        type="submit"
                                        aria-label="이름 저장"
                                        className="grid h-9 w-9 shrink-0 place-items-center rounded-sm text-success-600 transition-colors duration-150 hover:bg-success-50"
                                    >
                                        <Check className="h-4 w-4" aria-hidden="true" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={cancelRename}
                                        aria-label="이름 바꾸기 취소"
                                        className="grid h-9 w-9 shrink-0 place-items-center rounded-sm text-surface-500 transition-colors duration-150 hover:bg-surface-100"
                                    >
                                        <X className="h-4 w-4" aria-hidden="true" />
                                    </button>
                                </form>
                            </li>
                        );
                    }

                    return (
                        <li key={conversation.id} className="group relative">
                            <button
                                type="button"
                                onClick={() => onSelect(conversation.id)}
                                disabled={disabled}
                                aria-current={isActive ? 'true' : undefined}
                                className={[
                                    'flex w-full items-center gap-2 rounded-sm px-3 py-2.5 pr-20 text-left transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60',
                                    isActive
                                        ? 'bg-brand-50 text-brand-700'
                                        : 'text-surface-700 hover:bg-surface-100 hover:text-surface-900',
                                ].join(' ')}
                            >
                                <MessageSquare className="h-4 w-4 shrink-0" aria-hidden="true" />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-black">{title}</span>
                                    <span className="block text-xs font-semibold text-surface-500">
                                        {formatUpdatedAt(conversation.updated_at)}
                                    </span>
                                </span>
                            </button>
                            <span className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-0.5 transition-opacity duration-150 lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100">
                                <button
                                    type="button"
                                    onClick={() => beginRename(conversation)}
                                    disabled={disabled}
                                    aria-label={`${title} 이름 바꾸기`}
                                    className="grid h-8 w-8 place-items-center rounded-sm text-surface-500 transition-colors duration-150 hover:bg-surface-200 hover:text-surface-900 disabled:opacity-50"
                                >
                                    <Edit3 className="h-4 w-4" aria-hidden="true" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => confirmDelete(conversation)}
                                    disabled={disabled}
                                    aria-label={`${title} 삭제`}
                                    className="grid h-8 w-8 place-items-center rounded-sm text-surface-500 transition-colors duration-150 hover:bg-danger-50 hover:text-danger-600 disabled:opacity-50"
                                >
                                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                                </button>
                            </span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
