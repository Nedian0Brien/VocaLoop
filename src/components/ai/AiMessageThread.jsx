import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowDown, Check, Copy, FileText, Paperclip } from '../Icons';
import AiComposer from './AiComposer';
import AiFileImportCard from './AiFileImportCard';

// agent-chat-framework thread.aui: --thread-max-width 44rem, 메시지 간격 24px.
const THREAD_MAX_WIDTH = 'max-w-[44rem]';
const NEAR_BOTTOM_PX = 120;

const AttachmentChip = ({ attachment }) => (
    <span className="inline-flex max-w-full items-center gap-2 rounded-md border border-surface-200 bg-surface-0 py-1.5 pl-2 pr-3 text-sm">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xs bg-brand-600 text-white">
            <FileText className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="min-w-0">
            <span className="block truncate font-bold text-surface-900">{attachment.file_name}</span>
            <span className="block text-xs font-semibold uppercase text-surface-500">{attachment.kind}</span>
        </span>
    </span>
);

/** 프레임워크의 UserMessage — 오른쪽 정렬, 왼쪽 72px 여백, bg-muted 말풍선, 첨부는 말풍선 위. */
const UserMessage = ({ message }) => {
    const attachment = message.payload?.attachment;
    return (
        <li
            data-role="user"
            className="grid auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] content-start gap-y-2 px-2 [&>*]:col-start-2"
        >
            {attachment && (
                <div className="flex w-full flex-row justify-end gap-2">
                    <AttachmentChip attachment={attachment} />
                </div>
            )}
            {message.content && (
                <div className="min-w-0 rounded-md bg-surface-100 px-4 py-2 text-base leading-relaxed text-surface-900 wrap-break-word">
                    <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
            )}
        </li>
    );
};

const CopyButton = ({ text }) => {
    const [isCopied, setIsCopied] = useState(false);

    const copy = async () => {
        try {
            await navigator.clipboard?.writeText(text);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 1500);
        } catch (error) {
            console.warn('Copy failed:', error);
        }
    };

    return (
        <button
            type="button"
            onClick={copy}
            aria-label={isCopied ? '복사됨' : '복사'}
            title="복사"
            className="grid h-7 w-7 place-items-center rounded-xs text-surface-500 transition-colors duration-150 hover:bg-surface-100 hover:text-surface-900"
        >
            {isCopied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
        </button>
    );
};

/** 프레임워크의 AssistantMessage — 말풍선 없이 평문, 아래에 액션 바. 파일 카드는 tool UI 자리에 들어간다. */
const AssistantMessage = ({ folders, importProgress, isBusy, isLast, message, onCancelImport, onSaveImport, savingMessageId }) => (
    <li data-role="assistant" className="group relative">
        <div className="px-2 leading-relaxed text-surface-900 wrap-break-word">
            {message.kind === 'file_import' ? (
                <AiFileImportCard
                    message={message}
                    folders={folders}
                    isBusy={isBusy && savingMessageId !== message.id}
                    isSaving={savingMessageId === message.id}
                    progress={savingMessageId === message.id ? importProgress : null}
                    onSave={onSaveImport}
                    onCancel={onCancelImport}
                />
            ) : (
                <p className="whitespace-pre-wrap text-base">{message.content}</p>
            )}
        </div>
        {message.kind === 'text' && message.content && (
            <div
                className={[
                    'ml-1 flex min-h-7 items-center pt-1.5 transition-opacity duration-150',
                    isLast ? 'opacity-100' : 'opacity-0 group-focus-within:opacity-100 group-hover:opacity-100',
                ].join(' ')}
            >
                <CopyButton text={message.content} />
            </div>
        )}
    </li>
);

const Welcome = () => (
    <div className="mb-6 flex flex-col items-center px-4 text-center">
        <h1 className="text-2xl font-medium tracking-tight text-surface-900">무엇을 도와드릴까요?</h1>
        <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-surface-500">
            PDF·CSV·XLSX 단어장 파일을 첨부하면 단어와 뜻을 뽑아 폴더로 만들어 드립니다.
        </p>
    </div>
);

const Suggestions = ({ onAttach }) => (
    <div className="flex w-full flex-wrap items-center justify-center gap-2 px-4">
        <button
            type="button"
            onClick={onAttach}
            className="inline-flex h-auto items-center gap-1.5 whitespace-nowrap rounded-pill border border-surface-200 px-3.5 py-1.5 text-sm font-semibold text-surface-800 transition-colors duration-150 hover:bg-surface-100"
        >
            <Paperclip className="h-4 w-4" aria-hidden="true" />
            단어장 파일 첨부
        </button>
        <span className="inline-flex items-center rounded-pill px-3.5 py-1.5 text-sm font-semibold text-surface-400">
            단어 검색 · 학습 조언 · 시험지는 준비 중
        </span>
    </div>
);

const HistorySkeleton = () => (
    <div role="status" className="flex flex-col gap-y-6">
        <span className="sr-only">대화 불러오는 중</span>
        <span className="ml-auto h-9 w-2/5 animate-pulse rounded-md bg-surface-100" />
        <div className="flex flex-col gap-y-2">
            <span className="h-4 w-11/12 animate-pulse rounded-xs bg-surface-100" />
            <span className="h-4 w-4/5 animate-pulse rounded-xs bg-surface-100" />
            <span className="h-4 w-3/5 animate-pulse rounded-xs bg-surface-100" />
        </div>
    </div>
);

/**
 * 스레드 — agent-chat-framework `thread.aui` 의 구조.
 * 스크롤 뷰포트 안에 가운데 정렬 열(44rem), 메시지 목록, 그리고 sticky 하단 푸터
 * (맨 아래로 버튼 · 컴포저 · 빈 화면일 때 제안 칩). 빈 화면에서는 환영 문구와 컴포저가 가운데 온다.
 */
export default function AiMessageThread({
    composerRef,
    folders,
    importProgress,
    isBusy,
    isLoading,
    isSending,
    messages,
    onCancelImport,
    onSaveImport,
    onSend,
    savingMessageId,
}) {
    const viewportRef = useRef(null);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const isEmpty = messages.length === 0 && !isLoading;
    const lastMessageId = messages[messages.length - 1]?.id ?? null;
    const lastUserMessageId = [...messages].reverse().find((message) => message.role === 'user')?.id ?? null;

    const scrollToBottom = useCallback((behavior = 'smooth') => {
        const viewport = viewportRef.current;
        if (!viewport) return;
        viewport.scrollTo({ top: viewport.scrollHeight, behavior });
    }, []);

    const handleScroll = useCallback(() => {
        const viewport = viewportRef.current;
        if (!viewport) return;
        const distance = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
        setIsAtBottom(distance < NEAR_BOTTOM_PX);
    }, []);

    // 내가 보낸 메시지가 붙으면 항상 맨 아래로.
    useLayoutEffect(() => {
        if (lastUserMessageId !== null) scrollToBottom('auto');
    }, [lastUserMessageId, scrollToBottom]);

    // 그 밖의 새 메시지(폴링으로 온 답)는 아래를 보고 있을 때만 따라간다.
    // 같은 메시지가 갱신될 때(배치 저장)는 id 가 안 바뀌므로 스크롤을 건드리지 않는다.
    const wasAtBottomRef = useRef(true);
    wasAtBottomRef.current = isAtBottom;
    useEffect(() => {
        if (lastMessageId !== null && wasAtBottomRef.current) scrollToBottom('auto');
    }, [lastMessageId, scrollToBottom]);

    const openFilePicker = () => composerRef.current?.openFilePicker();

    return (
        <div
            ref={viewportRef}
            onScroll={handleScroll}
            className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden scroll-smooth"
        >
            <div className={['mx-auto flex w-full flex-1 flex-col px-4 pt-4', THREAD_MAX_WIDTH, isEmpty ? 'justify-center' : ''].join(' ')}>
                {isEmpty && <Welcome />}
                {isLoading && messages.length === 0 && <HistorySkeleton />}

                {messages.length > 0 && (
                    <ol className="mb-14 flex flex-col gap-y-6" aria-label="메시지">
                        {messages.map((message) =>
                            message.role === 'user' ? (
                                <UserMessage key={message.id} message={message} />
                            ) : (
                                <AssistantMessage
                                    key={message.id}
                                    message={message}
                                    isLast={message.id === lastMessageId}
                                    folders={folders}
                                    importProgress={importProgress}
                                    isBusy={isBusy}
                                    onCancelImport={onCancelImport}
                                    onSaveImport={onSaveImport}
                                    savingMessageId={savingMessageId}
                                />
                            ),
                        )}
                    </ol>
                )}

                <div
                    className={[
                        'flex flex-col gap-4 overflow-visible bg-surface-0 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-6',
                        isEmpty ? '' : 'sticky bottom-0 mt-auto rounded-t-xl',
                    ].join(' ')}
                >
                    {!isEmpty && !isAtBottom && (
                        <button
                            type="button"
                            onClick={() => scrollToBottom('smooth')}
                            aria-label="맨 아래로"
                            className="absolute -top-12 z-10 grid h-9 w-9 place-items-center self-center rounded-pill border border-surface-200 bg-surface-0 text-surface-700 shadow-[var(--shadow-card)] transition-colors duration-150 hover:bg-surface-100"
                        >
                            <ArrowDown className="h-4 w-4" aria-hidden="true" />
                        </button>
                    )}
                    <AiComposer ref={composerRef} autoFocus={isEmpty} disabled={isBusy} isSending={isSending} onSend={onSend} />
                    {isEmpty && <Suggestions onAttach={openFilePicker} />}
                </div>
            </div>
        </div>
    );
}
