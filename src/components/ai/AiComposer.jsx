import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { FileText, Paperclip, Send, X } from '../Icons';
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
 * 메시지 입력 + 파일 첨부. Enter 로 보내고 Shift+Enter 로 줄을 바꾼다.
 * 부모가 `ref.current.openFilePicker()` 로 첨부 창을 열 수 있다 (빈 화면의 "파일 첨부" 버튼).
 */
const AiComposer = forwardRef(function AiComposer({ disabled = false, isSending = false, onSend }, ref) {
    const [content, setContent] = useState('');
    const [file, setFile] = useState(null);
    const [fileError, setFileError] = useState('');
    const fileInputRef = useRef(null);
    const textareaRef = useRef(null);

    useImperativeHandle(ref, () => ({
        openFilePicker: () => fileInputRef.current?.click(),
        focus: () => textareaRef.current?.focus(),
    }));

    const isBusy = disabled || isSending;
    const canSend = !isBusy && (content.trim().length > 0 || file !== null);

    const handleFileChange = (event) => {
        const picked = event.target.files?.[0] || null;
        event.target.value = '';
        if (!picked) return;
        const message = validateImportFile(picked);
        setFileError(message);
        setFile(message ? null : picked);
        textareaRef.current?.focus();
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
            className="border-t border-surface-100 bg-surface-0 px-4 py-3"
            onSubmit={(event) => {
                event.preventDefault();
                submit();
            }}
        >
            {file && (
                <div className="mb-2 inline-flex max-w-full items-center gap-2 rounded-pill border border-brand-100 bg-brand-50 py-1.5 pl-3 pr-1.5 text-xs font-bold text-brand-700">
                    <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{file.name}</span>
                    <span className="shrink-0 text-brand-500">{formatFileSize(file.size)}</span>
                    <button
                        type="button"
                        onClick={clearFile}
                        disabled={isBusy}
                        aria-label="첨부 파일 제거"
                        className="grid h-6 w-6 shrink-0 place-items-center rounded-pill text-brand-600 transition-colors duration-150 hover:bg-brand-100 disabled:opacity-50"
                    >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                </div>
            )}
            {fileError && (
                <p className="mb-2 text-xs font-bold text-danger-600" role="alert">{fileError}</p>
            )}

            <div className="flex items-end gap-2">
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
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isBusy}
                    aria-label="파일 첨부"
                    title="PDF·CSV·XLSX 첨부"
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-surface-200 bg-surface-0 text-surface-600 transition-colors duration-150 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <Paperclip className="h-5 w-5" aria-hidden="true" />
                </button>

                <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isBusy}
                    rows={1}
                    maxLength={4000}
                    placeholder={file ? '요청을 적어도 됩니다. 예: TOEFL 폴더에 넣어줘' : '단어장 파일을 첨부하거나 메시지를 입력하세요'}
                    aria-label="메시지 입력"
                    className="max-h-40 min-h-11 flex-1 resize-none rounded-md border border-surface-300 bg-surface-50 px-4 py-3 text-base leading-5 text-surface-900 placeholder-surface-400 focus:border-brand-500 focus:bg-surface-0 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-60 md:text-sm"
                />

                <button
                    type="submit"
                    disabled={!canSend}
                    aria-label="보내기"
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-brand-600 text-white shadow-[var(--shadow-glow-brand)] transition-colors duration-150 hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-surface-200 disabled:text-surface-400 disabled:shadow-none"
                >
                    <Send className="h-5 w-5" aria-hidden="true" />
                </button>
            </div>
        </form>
    );
});

export default AiComposer;
