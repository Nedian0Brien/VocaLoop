import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Folder, Loader2, Plus, Trash2, X } from './Icons';

const NEW_FOLDER_VALUE = '__new__';

const splitWordInput = (value) =>
    String(value || '')
        .split(/[\n,;]+/)
        .map((item) => item.trim())
        .filter(Boolean);

const getProgressLabel = (phase) => {
    if (phase === 'retrying') return '재시도 중';
    if (phase === 'saving') return '저장 중';
    if (phase === 'folder') return '폴더 생성 중';
    if (phase === 'done') return '완료';
    return 'AI 분석 중';
};

export default function BulkWordAddModal({
    defaultFolderId,
    folders,
    isOpen,
    onClose,
    onSubmit,
    progress,
}) {
    const [draftWord, setDraftWord] = useState('');
    const [queuedWords, setQueuedWords] = useState([]);
    const [folderChoice, setFolderChoice] = useState('');
    const [newFolderName, setNewFolderName] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const inputRef = useRef(null);

    const isBusy = isSubmitting || Boolean(progress);
    const progressPercent = progress?.total
        ? Math.min(100, Math.round((progress.completed / progress.total) * 100))
        : 0;
    const submitLabel = isBusy ? '저장 중' : `${queuedWords.length}개 저장`;

    useEffect(() => {
        if (!isOpen) return;
        setDraftWord('');
        setQueuedWords([]);
        setFolderChoice(defaultFolderId ? String(defaultFolderId) : '');
        setNewFolderName('');
        setErrorMessage('');
        setIsSubmitting(false);
        window.setTimeout(() => inputRef.current?.focus(), 0);
    }, [defaultFolderId, isOpen]);

    useEffect(() => {
        if (!isOpen) return undefined;
        const handleKeyDown = (event) => {
            if (event.key === 'Escape' && !isBusy) onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isBusy, isOpen, onClose]);

    const queuedWordKeys = useMemo(
        () => new Set(queuedWords.map((word) => word.toLowerCase())),
        [queuedWords],
    );

    const addDraftToQueue = () => {
        const nextWords = splitWordInput(draftWord);
        if (nextWords.length === 0) return;

        const freshWords = nextWords.filter((word) => !queuedWordKeys.has(word.toLowerCase()));
        if (freshWords.length === 0) {
            setErrorMessage('이미 큐에 있는 단어입니다.');
            setDraftWord('');
            return;
        }

        setQueuedWords((prev) => [...prev, ...freshWords]);
        setDraftWord('');
        setErrorMessage('');
    };

    const removeQueuedWord = (targetWord) => {
        setQueuedWords((prev) => prev.filter((word) => word !== targetWord));
    };

    const handleSubmit = async () => {
        if (queuedWords.length === 0 || isBusy) return;
        const trimmedNewFolderName = newFolderName.trim();
        if (folderChoice === NEW_FOLDER_VALUE && !trimmedNewFolderName) {
            setErrorMessage('새 폴더 이름을 입력해 주세요.');
            return;
        }

        setIsSubmitting(true);
        setErrorMessage('');
        try {
            await onSubmit({
                words: queuedWords,
                folderId: folderChoice && folderChoice !== NEW_FOLDER_VALUE ? Number(folderChoice) : null,
                newFolderName: folderChoice === NEW_FOLDER_VALUE ? trimmedNewFolderName : '',
            });
            onClose();
        } catch (error) {
            setErrorMessage(error.message || '단어를 저장하지 못했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-900/50 p-4" role="presentation">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="bulk-word-modal-title"
                className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-card border border-surface-200 bg-white shadow-[var(--shadow-floating)]"
            >
                <div className="flex items-center justify-between border-b border-surface-100 px-5 py-4">
                    <div>
                        <h2 id="bulk-word-modal-title" className="text-lg font-black tracking-tight text-surface-900">
                            여러 단어 추가
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isBusy}
                        aria-label="대량 단어 추가 닫기"
                        className="rounded-sm p-2 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                    <label htmlFor="bulk-word-input" className="mb-2 block text-sm font-black text-surface-800">
                        단어 입력
                    </label>
                    <div className="flex gap-2">
                        <input
                            ref={inputRef}
                            id="bulk-word-input"
                            type="text"
                            value={draftWord}
                            onChange={(event) => setDraftWord(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    event.preventDefault();
                                    addDraftToQueue();
                                }
                            }}
                            aria-label="대량 추가 단어 입력"
                            placeholder="abate"
                            disabled={isBusy}
                            className="min-w-0 flex-1 rounded-md border border-surface-300 bg-surface-50 px-3 py-2.5 text-sm font-semibold text-surface-900 placeholder-surface-400 transition-colors focus:border-brand-500 focus:bg-surface-0 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                        <button
                            type="button"
                            onClick={addDraftToQueue}
                            disabled={isBusy || !draftWord.trim()}
                            className="inline-flex items-center gap-1.5 rounded-md border border-surface-300 bg-white px-3 py-2.5 text-sm font-black text-surface-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Plus className="h-4 w-4" aria-hidden="true" />
                            추가
                        </button>
                    </div>

                    <div className="mt-5">
                        <div className="mb-2 flex items-center justify-between">
                            <h3 className="text-sm font-black text-surface-800">저장할 단어</h3>
                            <span className="text-xs font-bold text-surface-500">{queuedWords.length}개</span>
                        </div>
                        <div className="min-h-28 rounded-md border border-surface-200 bg-surface-50 p-3">
                            {queuedWords.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {queuedWords.map((word) => (
                                        <span
                                            key={word}
                                            className="inline-flex max-w-full items-center gap-1.5 rounded-pill border border-brand-100 bg-white px-3 py-1.5 text-sm font-black text-surface-800 shadow-[var(--shadow-soft)]"
                                        >
                                            <span className="truncate">{word}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeQueuedWord(word)}
                                                disabled={isBusy}
                                                aria-label={`${word} 제거`}
                                                className="rounded-pill p-0.5 text-surface-400 transition-colors hover:bg-surface-100 hover:text-danger-600 disabled:cursor-not-allowed"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm font-semibold text-surface-500">
                                    대기 중인 단어가 없습니다.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                        <label className="block">
                            <span className="mb-2 flex items-center gap-1.5 text-sm font-black text-surface-800">
                                <Folder className="h-4 w-4 text-surface-400" aria-hidden="true" />
                                저장 폴더
                            </span>
                            <select
                                value={folderChoice}
                                onChange={(event) => {
                                    setFolderChoice(event.target.value);
                                    setErrorMessage('');
                                }}
                                disabled={isBusy}
                                aria-label="대량 단어 저장 폴더"
                                className="w-full rounded-md border border-surface-300 bg-white px-3 py-2.5 text-sm font-semibold text-surface-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <option value="">미분류</option>
                                {folders.map((folder) => (
                                    <option key={folder.id} value={folder.id}>{folder.name}</option>
                                ))}
                                <option value={NEW_FOLDER_VALUE}>새 폴더 생성</option>
                            </select>
                        </label>
                        {folderChoice === NEW_FOLDER_VALUE && (
                            <label className="block">
                                <span className="mb-2 block text-sm font-black text-surface-800">새 폴더 이름</span>
                                <input
                                    type="text"
                                    value={newFolderName}
                                    onChange={(event) => setNewFolderName(event.target.value)}
                                    disabled={isBusy}
                                    maxLength={30}
                                    aria-label="새 폴더 이름"
                                    placeholder="TOEFL"
                                    className="w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2.5 text-sm font-semibold text-surface-900 placeholder-surface-400 focus:border-brand-500 focus:bg-surface-0 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
                                />
                            </label>
                        )}
                    </div>

                    {progress && (
                        <div className="mt-5 rounded-md border border-brand-100 bg-brand-50 p-4">
                            <div className="mb-2 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin text-brand-600" aria-hidden="true" />
                                    <span className="text-sm font-black text-brand-700">
                                        {getProgressLabel(progress.phase)}
                                    </span>
                                </div>
                                <span className="text-xs font-black text-brand-700">
                                    {progress.completed} / {progress.total}
                                </span>
                            </div>
                            <div
                                role="progressbar"
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={progressPercent}
                                className="h-2 overflow-hidden rounded-pill bg-white"
                            >
                                <div
                                    className="h-full rounded-pill bg-brand-600 transition-all duration-300"
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                            {progress.currentWord && (
                                <p className="mt-2 truncate text-xs font-semibold text-brand-700">
                                    {progress.currentWord}
                                </p>
                            )}
                        </div>
                    )}

                    {errorMessage && (
                        <p className="mt-4 rounded-md border border-danger-200 bg-danger-50 px-3 py-2 text-sm font-bold text-danger-700">
                            {errorMessage}
                        </p>
                    )}
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-surface-100 px-5 py-4 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isBusy}
                        className="rounded-md px-4 py-2.5 text-sm font-black text-surface-600 transition-colors hover:bg-surface-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        취소
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isBusy || queuedWords.length === 0}
                        className="inline-flex items-center justify-center gap-2 rounded-md bg-brand-600 px-4 py-2.5 text-sm font-black text-white shadow-[var(--shadow-card)] transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-surface-200 disabled:text-surface-500 disabled:shadow-none"
                    >
                        {isBusy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                        {submitLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
