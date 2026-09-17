import React, { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { ArrowUp, FileText, Plus, X } from '../Icons';
import { AI_IMPORT_ACCEPT, AI_IMPORT_MAX_FILE_SIZE } from '../../services/aiAssistantApi';

const ACCEPTED_EXTENSIONS = AI_IMPORT_ACCEPT.split(',');

const formatFileSize = (bytes) => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    if (bytes >= 1024) return `${Math.round(bytes / 1024)}KB`;
    return `${bytes}B`;
};

export const validateImportFile = (file) => {
    if (!file) return '';
    const name = String(file.name || '').toLowerCase();
    if (name.endsWith('.xls')) return 'xls 파일은 읽을 수 없습니다. 엑셀에서 xlsx로 저장해서 올려 주세요.';
    if (!ACCEPTED_EXTENSIONS.some((extension) => name.endsWith(extension))) {
        return 'PDF, CSV, XLSX 파일만 올릴 수 있습니다.';
    }
    if (file.size > AI_IMPORT_MAX_FILE_SIZE) return '100MB 이하 파일만 올릴 수 있습니다.';
    return '';
};

/**
 * agent-chat-framework `thread.aui` 의 Composer 구성 — 둥근 셸 안에
 * 첨부 줄 · 입력 · 액션 줄(왼쪽 첨부 +, 오른쪽 보내기 ↑).
 * Enter 로 보내고 Shift+Enter 로 줄을 바꾼다. 파일은 드롭해도 된다.
 * 부모가 `ref.current.openFilePicker()` 로 첨부 창을 열 수 있다.
 */
const AiComposer = forwardRef(function AiComposer({ autoFocus = false, disabled = false, isSending = false, onSend }, ref) {
    const [content, setContent] = useState('');
    const [file, setFile] = useState(null);
    const [fileError, setFileError] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);
    const textareaRef = useRef(null);

    useImperativeHandle(ref, () => ({
        openFilePicker: () => fileInputRef.current?.click(),
        focus: () => textareaRef.current?.focus(),
    }));

    // 내용에 맞춰 높이를 키운다. 최대 높이는 CSS(max-h-48)가 막는다.
    useLayoutEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
    }, [content]);

    const isBusy = disabled || isSending;
    const canSend = !isBusy && (content.trim().length > 0 || file !== null);

    const acceptFile = (picked) => {
        if (!picked) return;
        const message = validateImportFile(picked);
        setFileError(message);
        setFile(message ? null : picked);
        textareaRef.current?.focus();
    };

    const handleFileChange = (event) => {
        const picked = event.target.files?.[0] || null;
        event.target.value = '';
        acceptFile(picked);
    };

    const handleDrop = (event) => {
        event.preventDefault();
        setIsDragging(false);
        if (isBusy) return;
        acceptFile(event.dataTransfer?.files?.[0] || null);
    };

    const clearFile = () => {
        setFile(null);
        setFileError('');
    };

    const submit = async () => {
        if (!canSend) return;
        const sent = await onSend({ content: content.trim(), file });
        if (sent) {
            setContent('');
            setFile(null);
            setFileError('');
        }
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent?.isComposing) {
            event.preventDefault();
            submit();
        }
    };

    return (
        <form
            className="relative flex w-full flex-col"
            onSubmit={(event) => {
                event.preventDefault();
                submit();
            }}
        >
            <div
                data-dragging={isDragging || undefined}
                onDragOver={(event) => {
                    event.preventDefault();
                    if (!isBusy) setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => textareaRef.current?.focus()}
                className="flex w-full cursor-text flex-col gap-2 rounded-xl border border-surface-200 bg-surface-0 p-2 shadow-[var(--shadow-soft)] transition-[border-color] duration-150 focus-within:border-surface-300 data-dragging:border-dashed data-dragging:border-brand-500 data-dragging:bg-brand-50"
            >
                {file && (
                    <div className="flex w-full flex-row items-center gap-2 overflow-x-auto">
                        <div className="inline-flex max-w-full items-center gap-2 rounded-md border border-surface-200 bg-surface-50 py-1.5 pl-2.5 pr-1.5 text-sm">
                            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xs bg-brand-600 text-white">
                                <FileText className="h-4 w-4" aria-hidden="true" />
                            </span>
                            <span className="min-w-0">
                                <span className="block truncate font-bold text-surface-900">{file.name}</span>
                                <span className="block text-xs font-semibold text-surface-500">{formatFileSize(file.size)}</span>
                            </span>
                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    clearFile();
                                }}
                                disabled={isBusy}
                                aria-label="첨부 파일 제거"
                                className="grid h-6 w-6 shrink-0 place-items-center rounded-pill text-surface-500 transition-colors duration-150 hover:bg-surface-200 hover:text-surface-900 disabled:opacity-50"
                            >
                                <X className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                        </div>
                    </div>
                )}
                {fileError && (
                    <p className="px-2.5 text-xs font-bold text-danger-600" role="alert">{fileError}</p>
                )}

                <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isBusy}
                    rows={1}
                    maxLength={4000}
                    autoFocus={autoFocus}
                    enterKeyHint="send"
                    placeholder={file ? '요청을 적어도 됩니다. 예: TOEFL 폴더에 넣어줘' : '메시지를 보내거나 단어장 파일을 첨부하세요'}
                    aria-label="메시지 입력"
                    className="max-h-48 min-h-10 w-full resize-none bg-transparent px-2.5 py-1 text-base leading-6 text-surface-900 caret-brand-600 outline-none focus-visible:outline-none placeholder:text-surface-400 disabled:cursor-not-allowed disabled:opacity-60"
                />

                <div className="relative flex items-center justify-between">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept={AI_IMPORT_ACCEPT}
                        onChange={handleFileChange}
                        className="hidden"
                        aria-label="단어장 파일 선택"
                        data-testid="ai-file-input"
                    />
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            fileInputRef.current?.click();
                        }}
                        disabled={isBusy}
                        aria-label="파일 첨부"
                        title="PDF·CSV·XLSX 첨부"
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-pill text-surface-500 transition-colors duration-150 hover:bg-surface-200 hover:text-surface-900 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                        type="submit"
                        disabled={!canSend}
                        aria-label="보내기"
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-pill bg-brand-600 text-white transition-colors duration-150 hover:bg-brand-700 active:scale-[0.96] disabled:cursor-not-allowed disabled:bg-surface-200 disabled:text-surface-400"
                    >
                        <ArrowUp className="h-4 w-4" aria-hidden="true" />
                    </button>
                </div>
            </div>
        </form>
    );
});

export default AiComposer;
