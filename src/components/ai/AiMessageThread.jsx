import React, { useEffect, useRef } from 'react';
import { FileText, Loader2, Paperclip, Sparkles } from '../Icons';
import { Button } from '../../design-system';
import AiFileImportCard from './AiFileImportCard';

const AssistantAvatar = () => (
    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-pill bg-gradient-to-br from-brand-500 to-indigo-pair-600 text-white shadow-[var(--shadow-glow-brand)]">
        <Sparkles className="h-4 w-4" aria-hidden="true" />
    </div>
);

const AttachmentChip = ({ attachment }) => (
    <span className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-pill bg-white/15 px-2.5 py-1 text-xs font-bold">
        <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">{attachment.file_name}</span>
    </span>
);

const EmptyState = ({ onAttach }) => (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-pair-600 text-white shadow-[var(--shadow-glow-brand)]">
            <Sparkles className="h-7 w-7" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-lg font-black tracking-tight text-surface-900">VocaLoop AI</h2>
        <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-surface-600">
            PDF·CSV·XLSX 단어장 파일을 첨부하면 단어와 뜻을 뽑아 폴더로 만들어 드립니다.
            <br />
            단어 검색·학습 조언·시험지는 준비 중입니다.
        </p>
        <Button className="mt-6" leftIcon={Paperclip} onClick={onAttach}>
            단어장 파일 첨부
        </Button>
        <p className="mt-3 text-xs font-semibold text-surface-500">100MB 이하 · 텍스트가 있는 PDF</p>
    </div>
);

/**
 * 메시지 목록. 사용자 말풍선은 오른쪽, 어시스턴트는 왼쪽.
 * file_import 메시지는 말풍선 대신 카드로 그린다.
 */
export default function AiMessageThread({
    folders,
    importProgress,
    isBusy,
    isLoading,
    messages,
    onAttach,
    onCancelImport,
    onSaveImport,
    savingMessageId,
}) {
    const bottomRef = useRef(null);
    const lastMessageId = messages[messages.length - 1]?.id ?? null;

    useEffect(() => {
        bottomRef.current?.scrollIntoView?.({ block: 'end' });
    }, [lastMessageId]);

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center text-surface-500">
                <Loader2 className="h-6 w-6 animate-spin text-brand-600" aria-hidden="true" />
                <span className="sr-only">대화 불러오는 중</span>
            </div>
        );
    }

    if (messages.length === 0) {
        return <EmptyState onAttach={onAttach} />;
    }

    return (
        <ol className="space-y-4 px-4 py-4 sm:px-6" aria-label="메시지">
            {messages.map((message) => {
                if (message.role === 'user') {
                    const attachment = message.payload?.attachment;
                    return (
                        <li key={message.id} className="flex justify-end">
                            <div className="max-w-[85%] rounded-lg rounded-br-xs bg-brand-600 px-4 py-3 text-sm font-semibold leading-6 text-white shadow-[var(--shadow-card)]">
                                {message.content && <p className="whitespace-pre-wrap break-words">{message.content}</p>}
                                {attachment && <AttachmentChip attachment={attachment} />}
                            </div>
                        </li>
                    );
                }

                return (
                    <li key={message.id} className="flex items-start gap-3">
                        <AssistantAvatar />
                        <div className="min-w-0 flex-1 sm:max-w-[85%]">
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
                                <div className="rounded-lg rounded-tl-xs border border-surface-200 bg-surface-0 px-4 py-3 text-sm font-semibold leading-6 text-surface-800 shadow-[var(--shadow-soft)]">
                                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                                </div>
                            )}
                        </div>
                    </li>
                );
            })}
            <li ref={bottomRef} aria-hidden="true" />
        </ol>
    );
}
