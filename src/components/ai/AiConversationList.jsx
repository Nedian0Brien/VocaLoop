import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Edit3, MoreHorizontal, Plus, Search, Trash2 } from '../Icons';

export const UNTITLED_CONVERSATION = '새 대화';

const DAY_IN_MS = 86_400_000;

/**
 * agent-chat-framework `thread-list.aui` 의 묶음 규칙 — 오늘 · 어제 · 이전.
 * 날짜를 못 읽는 항목은 맨 앞(오늘)에 둔다.
 */
export const groupConversations = (conversations, now = new Date()) => {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const labelFor = (value) => {
        const time = new Date(value).getTime();
        if (Number.isNaN(time) || time >= startOfToday) return '오늘';
        if (time >= startOfToday - DAY_IN_MS) return '어제';
        return '이전';
    };

    const groups = [];
    for (const conversation of conversations) {
        const label = labelFor(conversation.updated_at);
        const last = groups[groups.length - 1];
        if (last?.label === label) last.items.push(conversation);
        else groups.push({ label, items: [conversation] });
    }
    return groups;
};

const ItemMenu = ({ onClose, onDelete, onRename, title }) => {
    const menuRef = useRef(null);

    useEffect(() => {
        const handlePointer = (event) => {
            if (!menuRef.current?.contains(event.target)) onClose();
        };
        const handleKey = (event) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('mousedown', handlePointer);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handlePointer);
            document.removeEventListener('keydown', handleKey);
        };
    }, [onClose]);

    return (
        <div
            ref={menuRef}
            role="menu"
            aria-label={`${title} 메뉴`}
            className="absolute right-0 top-full z-20 mt-1 min-w-36 rounded-sm border border-surface-200 bg-surface-0 p-1 shadow-[var(--shadow-elevated)]"
        >
            <button
                type="button"
                role="menuitem"
                onClick={() => {
                    onClose();
                    onRename();
                }}
                className="flex w-full items-center gap-2 rounded-xs px-2.5 py-1.5 text-left text-sm font-semibold text-surface-800 hover:bg-surface-100"
            >
                <Edit3 className="h-4 w-4" aria-hidden="true" />
                이름 바꾸기
            </button>
            <button
                type="button"
                role="menuitem"
                onClick={() => {
                    onClose();
                    onDelete();
                }}
                className="flex w-full items-center gap-2 rounded-xs px-2.5 py-1.5 text-left text-sm font-semibold text-danger-600 hover:bg-danger-50"
            >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                삭제
            </button>
        </div>
    );
};

const ConversationItem = ({ conversation, disabled, isActive, onDelete, onRename, onSelect }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isRenaming, setIsRenaming] = useState(false);
    const [draft, setDraft] = useState('');
    const inputRef = useRef(null);
    const title = conversation.title || UNTITLED_CONVERSATION;

    useEffect(() => {
        if (isRenaming) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [isRenaming]);

    const beginRename = () => {
        setDraft(conversation.title || '');
        setIsRenaming(true);
    };

    const commitRename = async () => {
        const trimmed = draft.trim();
        setIsRenaming(false);
        if (trimmed && trimmed !== conversation.title) await onRename(conversation.id, trimmed);
    };

    const confirmDelete = () => {
        if (!window.confirm(`'${title}' 대화를 삭제할까요? 대화 안의 카드도 함께 사라집니다.`)) return;
        onDelete(conversation.id);
    };

    if (isRenaming) {
        return (
            <li className="flex h-8 items-center px-0.5">
                <input
                    ref={inputRef}
                    type="text"
                    value={draft}
                    maxLength={80}
                    onChange={(event) => setDraft(event.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            commitRename();
                        } else if (event.key === 'Escape') {
                            setIsRenaming(false);
                        }
                    }}
                    aria-label="대화 이름"
                    className="h-8 w-full rounded-xs border border-brand-500 bg-surface-0 px-2 text-sm font-semibold text-surface-900 outline-none ring-2 ring-brand-500/30"
                />
            </li>
        );
    }

    return (
        <li
            className={[
                'group relative flex h-8 items-center rounded-xs transition-colors duration-150',
                isActive || isMenuOpen ? 'bg-surface-100' : 'hover:bg-surface-100',
            ].join(' ')}
        >
            <button
                type="button"
                onClick={() => onSelect(conversation.id)}
                disabled={disabled}
                aria-current={isActive ? 'true' : undefined}
                className="flex h-full min-w-0 flex-1 items-center rounded-xs px-2.5 pr-9 text-left text-sm text-surface-800 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
                <span className={['min-w-0 flex-1 truncate', isActive ? 'font-bold text-surface-900' : 'font-semibold'].join(' ')}>
                    {title}
                </span>
            </button>
            <div className="absolute right-1 top-1/2 -translate-y-1/2">
                <button
                    type="button"
                    onClick={() => setIsMenuOpen((open) => !open)}
                    disabled={disabled}
                    aria-label={`${title} 메뉴`}
                    aria-haspopup="menu"
                    aria-expanded={isMenuOpen}
                    className={[
                        'grid h-6 w-6 place-items-center rounded-xs text-surface-500 transition-opacity duration-150 hover:bg-surface-200 hover:text-surface-900 disabled:opacity-50',
                        isMenuOpen || isActive ? 'opacity-100' : 'lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100',
                    ].join(' ')}
                >
                    <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                </button>
                {isMenuOpen && (
                    <ItemMenu title={title} onClose={() => setIsMenuOpen(false)} onRename={beginRename} onDelete={confirmDelete} />
                )}
            </div>
        </li>
    );
};

/**
 * 대화 목록. agent-chat-framework `thread-list.aui` 의 구성을 따른다 —
 * 새 대화 · 검색 · 오늘/어제/이전 묶음 · 32px 행 · 호버 시 "더보기" 메뉴(이름 바꾸기·삭제).
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
    const [search, setSearch] = useState('');
    const query = search.trim().toLowerCase();
    const isDraftActive = activeConversationId === null;

    const filtered = useMemo(
        () => conversations.filter((conversation) => !query || (conversation.title || UNTITLED_CONVERSATION).toLowerCase().includes(query)),
        [conversations, query],
    );
    const groups = useMemo(() => groupConversations(filtered), [filtered]);

    return (
        <nav className="flex h-full min-h-0 flex-col gap-0.5 px-2 pb-3" aria-label="대화 목록">
            <button
                type="button"
                onClick={onStartNew}
                disabled={disabled}
                aria-label="새 대화 시작"
                data-active={isDraftActive || undefined}
                className="flex h-8 shrink-0 items-center gap-2 rounded-xs px-2.5 text-sm font-semibold text-surface-800 transition-colors duration-150 hover:bg-surface-100 data-active:bg-surface-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
                <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="whitespace-nowrap">새 대화</span>
            </button>

            {conversations.length > 0 && (
                <div className="relative shrink-0 px-0.5 py-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" aria-hidden="true" />
                    <input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        aria-label="대화 검색"
                        placeholder="대화 검색"
                        className="h-8 w-full rounded-xs border border-surface-200 bg-surface-0 pl-8 pr-2 text-sm font-semibold text-surface-900 placeholder-surface-400 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
                    />
                </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto">
                {isLoading && conversations.length === 0 && (
                    <ul className="flex flex-col gap-0.5" role="status" aria-label="대화 불러오는 중">
                        {Array.from({ length: 5 }, (_, index) => (
                            <li key={index} className="flex h-8 items-center px-2.5">
                                <span className="h-3.5 w-full animate-pulse rounded-xs bg-surface-100" />
                            </li>
                        ))}
                    </ul>
                )}

                {!isLoading && query && filtered.length === 0 && (
                    <p className="px-2.5 py-4 text-sm font-semibold text-surface-500">검색 결과가 없습니다.</p>
                )}

                {groups.map((group) => (
                    <div key={group.label}>
                        <div className="px-2.5 pb-1 pt-3 text-xs font-semibold text-surface-500">{group.label}</div>
                        <ul className="flex flex-col gap-0.5">
                            {group.items.map((conversation) => (
                                <ConversationItem
                                    key={conversation.id}
                                    conversation={conversation}
                                    disabled={disabled}
                                    isActive={conversation.id === activeConversationId}
                                    onDelete={onDelete}
                                    onRename={onRename}
                                    onSelect={onSelect}
                                />
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </nav>
    );
}
