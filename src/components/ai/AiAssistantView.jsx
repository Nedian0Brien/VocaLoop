import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, MessageSquare, X } from '../Icons';
import { useAiAssistant } from '../../hooks/useAiAssistant';
import AiComposer from './AiComposer';
import AiConversationList, { UNTITLED_CONVERSATION } from './AiConversationList';
import AiMessageThread from './AiMessageThread';

/**
 * AI 탭. 왼쪽 대화 목록(lg 이상) 또는 드로어(그 아래), 오른쪽 스레드 + 컴포저.
 *
 * 저장은 기존 단어 추가 경로(onCreateFolder → onBulkAddWords)를 그대로 쓴다. 이 화면은
 * 대화와 카드 상태만 맡는다.
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
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const composerRef = useRef(null);

    const isBusy = isBulkAdding || assistant.savingMessageId !== null;
    const activeTitle = assistant.activeConversation?.title || UNTITLED_CONVERSATION;

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

    return (
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="hidden h-[calc(100dvh-11rem)] overflow-hidden rounded-card border border-surface-100 bg-surface-0 shadow-[var(--shadow-card)] lg:block">
                <AiConversationList {...listProps} />
            </aside>

            <section
                aria-label="VocaLoop AI 대화"
                className="flex h-[calc(100dvh-12.5rem-env(safe-area-inset-bottom))] min-h-[28rem] flex-col overflow-hidden rounded-card border border-surface-100 bg-surface-50 shadow-[var(--shadow-card)] md:h-[calc(100dvh-11rem)]"
            >
                <header className="flex items-center gap-2 border-b border-surface-100 bg-surface-0 px-3 py-2 lg:px-6 lg:py-3">
                    <button
                        type="button"
                        onClick={() => setIsDrawerOpen(true)}
                        disabled={isBusy}
                        aria-label="대화 목록 열기"
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-sm text-surface-600 transition-colors duration-150 hover:bg-surface-100 hover:text-surface-900 disabled:opacity-50 lg:hidden"
                    >
                        <MessageSquare className="h-5 w-5" aria-hidden="true" />
                    </button>
                    <h1 className="min-w-0 flex-1 truncate text-sm font-black tracking-tight text-surface-900 lg:text-base">
                        {activeTitle}
                    </h1>
                    {assistant.isPolling && (
                        <span className="shrink-0 rounded-pill bg-brand-50 px-2.5 py-1 text-xs font-black text-brand-700">
                            단어 읽는 중
                        </span>
                    )}
                </header>

                {assistant.error && (
                    <div className="flex items-center gap-2 border-b border-danger-200 bg-danger-50 px-4 py-2 text-xs font-bold text-danger-700" role="alert">
                        <span className="min-w-0 flex-1">{assistant.error}</span>
                        <button
                            type="button"
                            onClick={() => assistant.setError('')}
                            aria-label="오류 닫기"
                            className="grid h-7 w-7 shrink-0 place-items-center rounded-sm text-danger-600 hover:bg-danger-100"
                        >
                            <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                    </div>
                )}

                <div className="min-h-0 flex-1 overflow-y-auto">
                    <AiMessageThread
                        folders={folders}
                        importProgress={bulkAddProgress}
                        isBusy={isBusy}
                        isLoading={assistant.isLoadingMessages}
                        messages={assistant.messages}
                        onAttach={() => composerRef.current?.openFilePicker()}
                        onCancelImport={assistant.cancelImport}
                        onSaveImport={assistant.saveImportBatch}
                        savingMessageId={assistant.savingMessageId}
                    />
                </div>

                <AiComposer
                    ref={composerRef}
                    disabled={isBusy}
                    isSending={assistant.isSending}
                    onSend={assistant.send}
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
                        className="absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col bg-surface-0 shadow-[var(--shadow-floating)]"
                    >
                        <div className="flex items-center justify-end px-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setIsDrawerOpen(false)}
                                aria-label="닫기"
                                className="grid h-9 w-9 place-items-center rounded-sm text-surface-500 transition-colors duration-150 hover:bg-surface-100 hover:text-surface-900"
                            >
                                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
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
