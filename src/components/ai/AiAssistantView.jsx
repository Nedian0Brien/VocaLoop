import React, { useEffect, useRef, useState } from 'react';
import { PanelLeft, X } from '../Icons';
import { useAiAssistant } from '../../hooks/useAiAssistant';
import AiConversationList, { UNTITLED_CONVERSATION } from './AiConversationList';
import AiMessageThread from './AiMessageThread';

const SIDEBAR_STORAGE_KEY = 'vocaloop.ai.sidebar';

// 화면 폭에 따라 다르게 저장하지 않는다. 데스크톱(lg)에서만 접힘 상태를 쓴다.
const readSidebarPreference = () => {
    try {
        return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) !== 'collapsed';
    } catch {
        return true;
    }
};

const writeSidebarPreference = (isOpen) => {
    try {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, isOpen ? 'open' : 'collapsed');
    } catch {
        // 저장 못 해도 화면은 그대로 동작한다.
    }
};

/**
 * AI 탭. agent-chat-framework 의 `threadlist-sidebar.aui` + `thread.aui` 구성 —
 * 왼쪽 16rem 사이드바(접힘 가능, 모바일은 드로어) · 오른쪽 전체 높이 스레드.
 * 글로벌 헤더(4rem) 아래를 전부 쓰고, 카드 틀 없이 배경 위에 바로 그린다.
 *
 * 저장은 기존 단어 추가 경로(onCreateFolder → onBulkAddWords)를 그대로 쓴다.
 */
export default function AiAssistantView({
    bulkAddProgress = null,
    folders = [],
    isBulkAdding = false,
    onBulkAddWords,
    onCreateFolder,
    showNotification,
}) {
    const assistant = useAiAssistant({ onBulkAddWords, onCreateFolder, showNotification });
    const [isSidebarOpen, setIsSidebarOpen] = useState(readSidebarPreference);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const composerRef = useRef(null);

    const isBusy = isBulkAdding || assistant.savingMessageId !== null;
    const activeTitle = assistant.activeConversation?.title || UNTITLED_CONVERSATION;

    useEffect(() => {
        writeSidebarPreference(isSidebarOpen);
    }, [isSidebarOpen]);

    useEffect(() => {
        if (!isDrawerOpen) return undefined;
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') setIsDrawerOpen(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isDrawerOpen]);

    const handleSelect = (conversationId) => {
        assistant.selectConversation(conversationId);
        setIsDrawerOpen(false);
    };

    const handleStartNew = () => {
        assistant.startNewConversation();
        setIsDrawerOpen(false);
        composerRef.current?.focus();
    };

    const listProps = {
        activeConversationId: assistant.activeConversationId,
        conversations: assistant.conversations,
        disabled: isBusy,
        isLoading: assistant.isLoadingConversations,
        onDelete: assistant.remove,
        onRename: assistant.rename,
        onSelect: handleSelect,
        onStartNew: handleStartNew,
    };

    const toggleSidebar = () => {
        if (window.matchMedia('(min-width: 1024px)').matches) setIsSidebarOpen((open) => !open);
        else setIsDrawerOpen(true);
    };

    return (
        <div className="flex h-[calc(100dvh-4rem)] bg-surface-0">
            <aside
                aria-label="대화 사이드바"
                aria-hidden={!isSidebarOpen}
                className={[
                    'hidden shrink-0 flex-col overflow-hidden border-r border-surface-100 bg-surface-50 transition-[width] duration-300 ease-[var(--ease-decel)] lg:flex',
                    isSidebarOpen ? 'w-64' : 'w-0 border-r-0',
                ].join(' ')}
            >
                <div className="flex h-12 shrink-0 items-center px-4">
                    <span className="text-sm font-black tracking-tight text-surface-900">대화</span>
                </div>
                <div className="min-h-0 flex-1">
                    <AiConversationList {...listProps} />
                </div>
            </aside>

            <section aria-label="VocaLoop AI 대화" className="relative flex min-w-0 flex-1 flex-col">
                <header className="flex h-12 shrink-0 items-center gap-2 px-3">
                    <button
                        type="button"
                        onClick={toggleSidebar}
                        aria-label="대화 목록"
                        title="대화 목록"
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-xs text-surface-500 transition-colors duration-150 hover:bg-surface-100 hover:text-surface-900"
                    >
                        <PanelLeft className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <h1 className="min-w-0 flex-1 truncate text-sm font-bold text-surface-700">{activeTitle}</h1>
                    {assistant.isPolling && (
                        <span className="shrink-0 rounded-pill bg-surface-100 px-2.5 py-1 text-xs font-bold text-surface-600">
                            단어 읽는 중
                        </span>
                    )}
                </header>

                {assistant.error && (
                    <div className="mx-auto flex w-full max-w-[44rem] items-center gap-2 px-4" role="alert">
                        <div className="flex w-full items-center gap-2 rounded-md border border-danger-200 bg-danger-50 px-3 py-2 text-xs font-bold text-danger-700">
                            <span className="min-w-0 flex-1">{assistant.error}</span>
                            <button
                                type="button"
                                onClick={() => assistant.setError('')}
                                aria-label="오류 닫기"
                                className="grid h-6 w-6 shrink-0 place-items-center rounded-xs text-danger-600 hover:bg-danger-100"
                            >
                                <X className="h-4 w-4" aria-hidden="true" />
                            </button>
                        </div>
                    </div>
                )}

                <AiMessageThread
                    composerRef={composerRef}
                    folders={folders}
                    importProgress={bulkAddProgress}
                    isBusy={isBusy}
                    isLoading={assistant.isLoadingMessages}
                    isSending={assistant.isSending}
                    messages={assistant.messages}
                    onCancelImport={assistant.cancelImport}
                    onSaveImport={assistant.saveImportBatch}
                    onSend={assistant.send}
                    savingMessageId={assistant.savingMessageId}
                />
            </section>

            {isDrawerOpen && (
                <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
                    <button
                        type="button"
                        onClick={() => setIsDrawerOpen(false)}
                        aria-label="대화 목록 닫기"
                        className="absolute inset-0 bg-surface-900/50"
                    />
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label="대화 목록"
                        className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-surface-50 shadow-[var(--shadow-floating)]"
                    >
                        <div className="flex h-12 shrink-0 items-center justify-between px-4">
                            <span className="text-sm font-black tracking-tight text-surface-900">대화</span>
                            <button
                                type="button"
                                onClick={() => setIsDrawerOpen(false)}
                                aria-label="닫기"
                                className="grid h-8 w-8 place-items-center rounded-xs text-surface-500 transition-colors duration-150 hover:bg-surface-100 hover:text-surface-900"
                            >
                                <X className="h-4 w-4" aria-hidden="true" />
                            </button>
                        </div>
                        <div className="min-h-0 flex-1">
                            <AiConversationList {...listProps} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
