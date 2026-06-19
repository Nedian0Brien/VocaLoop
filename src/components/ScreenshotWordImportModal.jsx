import React, { useEffect, useMemo, useState } from 'react';
import { Camera, Folder, Loader2, Trash2, X } from './Icons';
import { extractWordsFromScreenshot } from '../services/vocabularyImportApi';

const NEW_FOLDER_VALUE = '__new__';

const normalizeWords = (words) => {
    const seen = new Set();
    return (Array.isArray(words) ? words : [])
        .map((word) => String(word || '').trim())
        .filter((word) => {
            if (!word) return false;
            const key = word.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
};

const createWordRows = (words) =>
    normalizeWords(words).map((word, index) => ({
        id: `${word.toLowerCase()}-${index}`,
        value: word,
    }));

export default function ScreenshotWordImportModal({
    defaultFolderId,
    folders,
    isOpen,
    onClose,
    onSubmit,
    progress,
}) {
    const [wordRows, setWordRows] = useState([]);
    const [folderChoice, setFolderChoice] = useState('');
    const [newFolderName, setNewFolderName] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isExtracting, setIsExtracting] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const approvedWords = useMemo(
        () => normalizeWords(wordRows.map((row) => row.value)),
        [wordRows],
    );
    const isBusy = isExtracting || isSubmitting || Boolean(progress);
    const submitLabel = isBusy ? '저장 중' : `${approvedWords.length}개 저장`;

    useEffect(() => {
        if (!isOpen) return;
        setWordRows([]);
        setFolderChoice(defaultFolderId ? String(defaultFolderId) : '');
        setNewFolderName('');
        setErrorMessage('');
        setIsExtracting(false);
        setIsSubmitting(false);
    }, [defaultFolderId, isOpen]);

    useEffect(() => {
        if (!isOpen) return undefined;
        const handleKeyDown = (event) => {
            if (event.key === 'Escape' && !isBusy) onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isBusy, isOpen, onClose]);

    const applySuggestedFolderName = (suggestedFolderName) => {
        const suggested = String(suggestedFolderName || '').trim();
        if (!suggested) return;
        const existingFolder = folders.find(
            (folder) => folder.name.trim().toLowerCase() === suggested.toLowerCase(),
        );
        if (existingFolder) {
            setFolderChoice(String(existingFolder.id));
            setNewFolderName('');
            return;
        }
        setFolderChoice(NEW_FOLDER_VALUE);
        setNewFolderName(suggested);
    };

    const handleFileChange = async (event) => {
        const file = event.target.files?.[0];
        if (!file || isBusy) return;

        setIsExtracting(true);
        setErrorMessage('');
        try {
            const result = await extractWordsFromScreenshot(file);
            const nextRows = createWordRows(result?.words);
            if (nextRows.length === 0) {
                setWordRows([]);
                setErrorMessage('추출된 단어가 없습니다.');
                return;
            }
            setWordRows(nextRows);
            applySuggestedFolderName(result?.suggested_folder_name);
        } catch {
            setWordRows([]);
            setErrorMessage('이미지에서 단어를 읽지 못했습니다.');
        } finally {
            setIsExtracting(false);
            event.target.value = '';
        }
    };

    const updateWord = (rowId, value) => {
        setWordRows((prev) => prev.map((row) => (row.id === rowId ? { ...row, value } : row)));
        setErrorMessage('');
    };

    const removeWord = (rowId) => {
        setWordRows((prev) => prev.filter((row) => row.id !== rowId));
        setErrorMessage('');
    };

    const handleSubmit = async () => {
        if (approvedWords.length === 0 || isBusy) return;
        const trimmedNewFolderName = newFolderName.trim();
        if (folderChoice === NEW_FOLDER_VALUE && !trimmedNewFolderName) {
            setErrorMessage('새 폴더 이름을 입력해 주세요.');
            return;
        }

        setIsSubmitting(true);
        setErrorMessage('');
        try {
            await onSubmit({
                words: approvedWords,
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
                aria-labelledby="screenshot-word-import-title"
                className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-card border border-surface-200 bg-white shadow-[var(--shadow-floating)]"
            >
                <div className="flex items-center justify-between border-b border-surface-100 px-5 py-4">
                    <h2 id="screenshot-word-import-title" className="text-lg font-black tracking-tight text-surface-900">
                        이미지에서 추가
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isBusy}
                        aria-label="이미지 단어 추가 닫기"
                        className="rounded-sm p-2 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                    <label className="block">
                        <span className="mb-2 flex items-center gap-1.5 text-sm font-black text-surface-800">
                            <Camera className="h-4 w-4 text-surface-400" aria-hidden="true" />
                            단어장 이미지
                        </span>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            disabled={isBusy}
                            className="block w-full rounded-md border border-surface-300 bg-surface-50 px-3 py-2.5 text-sm font-semibold text-surface-700 file:mr-3 file:rounded-sm file:border-0 file:bg-surface-200 file:px-3 file:py-1.5 file:text-xs file:font-black file:text-surface-700 disabled:cursor-not-allowed disabled:opacity-60"
                        />
                    </label>

                    {isExtracting && (
                        <div className="mt-4 flex items-center gap-2 rounded-md border border-brand-100 bg-brand-50 px-3 py-2 text-sm font-black text-brand-700">
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            단어 읽는 중
                        </div>
                    )}

                    <div className="mt-5">
                        <div className="mb-2 flex items-center justify-between">
                            <h3 className="text-sm font-black text-surface-800">확인할 단어</h3>
                            <span className="text-xs font-bold text-surface-500">{approvedWords.length}개</span>
                        </div>
                        <div className="min-h-28 rounded-md border border-surface-200 bg-surface-50 p-3">
                            {wordRows.length > 0 ? (
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {wordRows.map((row, index) => (
                                        <div key={row.id} className="flex min-w-0 items-center gap-2">
                                            <input
                                                type="text"
                                                value={row.value}
                                                onChange={(event) => updateWord(row.id, event.target.value)}
                                                disabled={isBusy}
                                                aria-label={`추출 단어 ${index + 1}`}
                                                className="min-w-0 flex-1 rounded-md border border-surface-300 bg-white px-3 py-2 text-sm font-black text-surface-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeWord(row.id)}
                                                disabled={isBusy}
                                                aria-label={`${row.value} 제거`}
                                                className="rounded-sm p-2 text-surface-400 transition-colors hover:bg-surface-100 hover:text-danger-600 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm font-semibold text-surface-500">추출된 단어가 없습니다.</p>
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
                                aria-label="저장 폴더"
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
                        disabled={isBusy || approvedWords.length === 0}
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
