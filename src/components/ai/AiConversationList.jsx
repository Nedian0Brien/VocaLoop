import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Edit3, FileText, MessageSquare, MoreHorizontal, Plus, Search, Trash2 } from '../Icons';
import { parseServerDate } from '../../utils/serverDate';

export const UNTITLED_CONVERSATION = '새 대화';

const DAY_IN_MS = 86_400_000;
const timeFormatter = new Intl.DateTimeFormat('ko-KR', { hour: 'numeric', minute: '2-digit' });
const dateFormatter = new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' });

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

/**
 * agent-chat-framework `thread-list.aui` 의 묶음 규칙 — 오늘 · 어제 · 이전.
 * 날짜를 못 읽는 항목은 맨 앞(오늘)에 둔다.
 */
export const groupConversations = (conversations, now = new Date()) => {
    const today = startOfDay(now);
    const labelFor = (value) => {
        const time = parseServerDate(value).getTime();
        if (Number.isNaN(time) || time >= today) return '오늘';
        if (time >= today - DAY_IN_MS) return '어제';
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

/** 오늘이면 시각, 아니면 날짜. 묶음 제목이 날짜 구분을 이미 하므로 행에는 짧게만 적는다. */
export const formatConversationTime = (value, now = new Date()) => {
    const date = parseServerDate(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.getTime() >= startOfDay(now) ? timeFormatter.format(date) : dateFormatter.format(date);
};

const KIND_META = {
    file_import: { Icon: FileText, label: '파일 가져오기', tile: 'bg-brand-50 text-brand-600' },
    text: { Icon: MessageSquare, label: '대화', tile: 'bg-surface-100 text-surface-500' },
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
                className="flex w-full items-center gap-2 rounded-xs px-2.5 py-2 text-left text-sm font-semibold text-surface-800 hover:bg-surface-100"
            >
                <Edit3 className="h-4 w-4 text-surface-500" aria-hidden="true" />
                이름 바꾸기
            </button>
            <button
                type="button"
                role="menuitem"
                onClick={() => {
                    onClose();
                    onDelete();
                }}
                className="flex w-full items-center gap-2 rounded-xs px-2.5 py-2 text-left text-sm font-semibold text-danger-600 hover:bg-danger-50"
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
    const kind = KIND_META[conversation.last_kind] || KIND_META.text;

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
            <li className="flex h-11 items-center px-1">
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
                    className="focus-ring-none h-9 w-full rounded-sm border border-brand-500 bg-surface-0 px-3 text-sm font-bold text-surface-900 ring-2 ring-brand-500/25"
                />
            </li>
        );
    }

    return (
        <li
            className={[
                'group relative flex h-11 items-center rounded-sm transition-colors duration-150',
                isActive ? 'bg-brand-50' : isMenuOpen ? 'bg-surface-100' : 'hover:bg-surface-100',
            ].join(' ')}
        >
            <button
                type="button"
                onClick={() => onSelect(conversation.id)}
                disabled={disabled}
                aria-current={isActive ? 'true' : undefined}
                className="flex h-full min-w-0 flex-1 items-center gap-2.5 rounded-sm pl-2 pr-9 text-left outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
                <span
                    className={['grid h-7 w-7 shrink-0 place-items-center rounded-xs', isActive ? 'bg-brand-100 text-brand-700' : kind.tile].join(' ')}
                    aria-hidden="true"
                >
                    <kind.Icon className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                    <span className={['block truncate text-sm', isActive ? 'font-black text-brand-700' : 'font-bold text-surface-800'].join(' ')}>
                        {title}
                    </span>
                    <span className={['block truncate text-xs font-semibold', isActive ? 'text-brand-600/80' : 'text-surface-500'].join(' ')}>
                        {kind.label} · {formatConversationTime(conversation.updated_at)}
                    </span>
                </span>
            </button>
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                <button
                    type="button"
                    onClick={() => setIsMenuOpen((open) => !open)}
                    disabled={disabled}
                    aria-label={`${title} 메뉴`}
                    aria-haspopup="menu"
                    aria-expanded={isMenuOpen}
                    className={[
                        'grid h-7 w-7 place-items-center rounded-xs transition-opacity duration-150 disabled:opacity-50',
                        isActive ? 'text-brand-600 hover:bg-brand-100' : 'text-surface-500 hover:bg-surface-200 hover:text-surface-900',
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
 * 새 대화 · 검색 · 오늘/어제/이전 묶음 · 행마다 종류 아이콘과 시각 · 호버 시 더보기 메뉴(이름 바꾸기·삭제).
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
        <nav className="flex h-full min-h-0 flex-col px-3 pb-3" aria-label="대화 목록">
            <button
                type="button"
                onClick={onStartNew}
                disabled={disabled}
                aria-label="새 대화 시작"
                data-active={isDraftActive || undefined}
                className={[
                    'flex h-10 shrink-0 items-center gap-2.5 rounded-sm border px-3 text-sm font-bold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60',
                    isDraftActive
                        ? 'border-brand-200 bg-brand-50 text-brand-700'
                        : 'border-surface-200 bg-surface-0 text-surface-800 shadow-[var(--shadow-soft)] hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700',
                ].join(' ')}
            >
                <span className={['grid h-6 w-6 place-items-center rounded-xs', isDraftActive ? 'bg-brand-100 text-brand-700' : 'bg-brand-600 text-white'].join(' ')} aria-hidden="true">
                    <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                </span>
                <span className="whitespace-nowrap">새 대화</span>
            </button>

            {conversations.length > 0 && (
                <div className="relative mt-2 shrink-0">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" aria-hidden="true" />
                    <input
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        aria-label="대화 검색"
                        placeholder="대화 검색"
                        className="focus-ring-none h-9 w-full rounded-sm border border-transparent bg-surface-100 pl-9 pr-3 text-sm font-semibold text-surface-900 placeholder-surface-400 transition-colors duration-150 focus:border-brand-300 focus:bg-surface-0"
                    />
                </div>
            )}

            <div className="mt-1 min-h-0 flex-1 overflow-y-auto">
                {isLoading && conversations.length === 0 && (
                    <ul className="flex flex-col gap-1 pt-3" role="status" aria-label="대화 불러오는 중">
                        {Array.from({ length: 5 }, (_, index) => (
                            <li key={index} className="flex h-11 items-center gap-2.5 px-2">
                                <span className="h-7 w-7 shrink-0 animate-pulse rounded-xs bg-surface-100" />
                                <span className="flex-1 space-y-1.5">
                                    <span className="block h-3 w-3/4 animate-pulse rounded-xs bg-surface-100" />
                                    <span className="block h-2.5 w-1/2 animate-pulse rounded-xs bg-surface-100" />
                                </span>
                            </li>
                        ))}
                    </ul>
                )}

                {!isLoading && conversations.length === 0 && !isDraftActive && (
                    <p className="px-2 pt-6 text-center text-xs font-semibold leading-5 text-surface-500">
                        아직 대화가 없습니다.
                        <br />
                        단어장 파일을 첨부해 시작해 보세요.
                    </p>
                )}

                {!isLoading && query && filtered.length === 0 && (
                    <p className="px-2 pt-6 text-center text-xs font-semibold text-surface-500">검색 결과가 없습니다.</p>
                )}

                {groups.map((group) => (
                    <div key={group.label}>
                        <div className="px-2 pb-1.5 pt-4 text-xs font-bold text-surface-400">{group.label}</div>
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
