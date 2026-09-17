import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle, FileText, Folder, Loader2, Trash2, XCircle } from '../Icons';
import { Button } from '../../design-system';
import { describeImportSummary, getImportBatches } from '../../services/aiImportBatches';

const NEW_FOLDER_VALUE = '__new__';
const NO_FOLDER_VALUE = '';
const EMPTY_PAYLOAD = {};

const progressLabel = (progress) => {
    switch (progress?.phase) {
        case 'analyzing':
            return 'AI가 뜻·예문을 채우는 중';
        case 'retrying':
            return '다시 시도하는 중';
        case 'saving':
            return '저장하는 중';
        case 'done':
            return '끝났습니다';
        default:
            return '준비 중';
    }
};

const createRows = (entries, keyPrefix) =>
    entries.map((entry, index) => ({
        id: `${keyPrefix}-${index}`,
        word: entry.word || '',
        meaning_ko: entry.meaning_ko || '',
    }));

/**
 * 폴더 선택의 시작값. 사용자가 메시지에서 기존 폴더를 지목했으면 그 폴더, 아니면 새 폴더.
 * 두 번째 배치부터는 바로 앞 배치가 저장한 폴더를 잇는다.
 */
const initialFolderChoice = ({ payload, folders, previousResult }) => {
    if (previousResult?.status === 'saved' && previousResult.folder_id !== null) {
        const stillExists = folders.some((folder) => folder.id === previousResult.folder_id);
        if (stillExists) return { choice: String(previousResult.folder_id), newFolderName: '' };
    }
    const targetId = payload.target_folder_id;
    if (targetId !== null && targetId !== undefined && folders.some((folder) => folder.id === targetId)) {
        return { choice: String(targetId), newFolderName: '' };
    }
    return { choice: NEW_FOLDER_VALUE, newFolderName: payload.suggested_folder_name || '' };
};

export default function AiFileImportCard({
    folders = [],
    isBusy = false,
    isSaving = false,
    message,
    onCancel,
    onSave,
    progress = null,
}) {
    const payload = message.payload ?? EMPTY_PAYLOAD;
    const batches = useMemo(() => getImportBatches(payload), [payload]);
    const current = batches.current;
    const rowKey = `${message.id}-${current ? current.index : 'none'}`;

    const [rows, setRows] = useState(() => (current ? createRows(current.entries, rowKey) : []));
    const [folderChoice, setFolderChoice] = useState(NEW_FOLDER_VALUE);
    const [newFolderName, setNewFolderName] = useState('');
    const [localError, setLocalError] = useState('');

    useEffect(() => {
        if (!current) {
            setRows([]);
            return;
        }
        setRows(createRows(current.entries, rowKey));
        const previousResult = current.index > 0 ? batches.batches[current.index - 1]?.result : null;
        const initial = initialFolderChoice({ payload, folders, previousResult });
        setFolderChoice(initial.choice);
        setNewFolderName(initial.newFolderName);
        setLocalError('');
        // rowKey 가 바뀔 때(배치가 넘어갈 때)만 초기화한다. folders 갱신으로 편집 중인 값을 지우지 않는다.
    }, [rowKey]);

    const approvedEntries = useMemo(() => {
        const seen = new Set();
        return rows
            .map((row) => ({ word: row.word.trim(), meaning_ko: row.meaning_ko.trim() || null }))
            .filter((entry) => {
                if (!entry.word) return false;
                const key = entry.word.toLowerCase();
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
    }, [rows]);

    const isLocked = isBusy || isSaving;

    const updateRow = (rowId, field, value) => {
        setRows((prev) => prev.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)));
        setLocalError('');
    };

    const removeRow = (rowId) => {
        setRows((prev) => prev.filter((row) => row.id !== rowId));
        setLocalError('');
    };

    const handleSave = () => {
        if (!current || isLocked) return;
        if (approvedEntries.length === 0) {
            setLocalError('저장할 단어가 없습니다.');
            return;
        }
        const trimmedFolderName = newFolderName.trim();
        if (folderChoice === NEW_FOLDER_VALUE && !trimmedFolderName) {
            setLocalError('새 폴더 이름을 입력해 주세요.');
            return;
        }
        onSave({
            message,
            batchIndex: current.index,
            entries: approvedEntries,
            folderId: folderChoice && folderChoice !== NEW_FOLDER_VALUE ? Number(folderChoice) : null,
            newFolderName: folderChoice === NEW_FOLDER_VALUE ? trimmedFolderName : '',
        });
    };

    const handleCancel = () => {
        if (!current || isLocked) return;
        const remaining = batches.totalEntries - current.index * batches.batchSize;
        if (!window.confirm(`남은 ${remaining}개 단어를 가져오지 않고 그만둘까요?`)) return;
        onCancel({ message, batchIndex: current.index });
    };

    // --- 상태별 표시 ------------------------------------------------------------------

    if (message.status === 'pending') {
        return (
            <div className="flex items-center gap-3 rounded-md border border-surface-200 bg-surface-50 px-4 py-3 text-sm font-bold text-surface-700">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
                <span className="min-w-0">
                    단어 읽는 중
                    {payload.file_name && <span className="ml-2 truncate font-semibold text-surface-500">{payload.file_name}</span>}
                </span>
            </div>
        );
    }

    if (message.status === 'failed') {
        return (
            <div className="flex items-start gap-3 rounded-md border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700" role="alert">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                    <p className="font-black">{payload.error || '파일에서 단어를 읽지 못했습니다.'}</p>
                    {payload.file_name && <p className="mt-1 text-xs font-semibold text-danger-600">{payload.file_name}</p>}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {batches.completed.map((batch) => {
                const result = batch.result;
                const isSaved = result.status === 'saved';
                return (
                    <div
                        key={batch.index}
                        className={[
                            'flex items-start gap-3 rounded-md border px-4 py-3 text-sm',
                            isSaved ? 'border-success-200 bg-success-50 text-success-700' : 'border-surface-200 bg-surface-50 text-surface-600',
                        ].join(' ')}
                    >
                        {isSaved ? (
                            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                        ) : (
                            <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                        )}
                        <div className="min-w-0 flex-1">
                            <p className="font-black">
                                {batches.total > 1 ? `${batch.index + 1}번째 묶음 · ` : ''}
                                {isSaved
                                    ? `${batch.entries.length}개 → ${result.folder_name || folders.find((folder) => folder.id === result.folder_id)?.name || '미분류'}`
                                    : '가져오지 않음'}
                            </p>
                            {isSaved && (
                                <p className="mt-0.5 text-xs font-semibold">{describeImportSummary(result.summary)}</p>
                            )}
                            {isSaved && result.summary?.failed_words?.length > 0 && (
                                <p className="mt-1 text-xs font-semibold text-danger-600">
                                    실패: {result.summary.failed_words.join(', ')}
                                </p>
                            )}
                        </div>
                    </div>
                );
            })}

            {current && (
                <div className="overflow-hidden rounded-md border border-surface-200 bg-surface-0">
                    <div className="flex items-start gap-3 border-b border-surface-100 px-4 py-3">
                        <FileText className="mt-0.5 h-5 w-5 shrink-0 text-surface-500" aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-black text-surface-900">
                                {current.index === 0
                                    ? `${batches.totalEntries}개 단어를 찾았습니다`
                                    : `나머지 ${batches.totalEntries - current.index * batches.batchSize}개 중 다음 ${current.entries.length}개`}
                            </h3>
                            <p className="mt-0.5 text-xs font-semibold text-surface-500">
                                {batches.total > 1 && current.index === 0
                                    ? `한 번에 ${batches.batchSize}개씩 가져옵니다. 먼저 ${current.entries.length}개를 확인해 주세요.`
                                    : '잘못 읽힌 단어는 고치거나 빼고, 폴더를 정한 뒤 저장하세요.'}
                            </p>
                        </div>
                        <span className="shrink-0 rounded-pill bg-surface-100 px-2.5 py-1 text-xs font-bold text-surface-700">
                            {approvedEntries.length}개
                        </span>
                    </div>

                    <div className="max-h-80 overflow-y-auto px-4 py-3">
                        {rows.length > 0 ? (
                            <ul className="space-y-2">
                                {rows.map((row, index) => (
                                    <li key={row.id} className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={row.word}
                                            onChange={(event) => updateRow(row.id, 'word', event.target.value)}
                                            disabled={isLocked}
                                            aria-label={`단어 ${index + 1}`}
                                            className="h-9 min-w-0 flex-1 rounded-sm border border-surface-300 bg-white px-3 text-sm font-black text-surface-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
                                        />
                                        <input
                                            type="text"
                                            value={row.meaning_ko}
                                            onChange={(event) => updateRow(row.id, 'meaning_ko', event.target.value)}
                                            disabled={isLocked}
                                            placeholder="뜻 (비우면 AI가 채움)"
                                            aria-label={`단어 ${index + 1} 뜻`}
                                            className="h-9 min-w-0 flex-1 rounded-sm border border-surface-300 bg-surface-50 px-3 text-sm font-semibold text-surface-800 placeholder-surface-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeRow(row.id)}
                                            disabled={isLocked}
                                            aria-label={`${row.word || `단어 ${index + 1}`} 빼기`}
                                            className="grid h-9 w-9 shrink-0 place-items-center rounded-sm text-surface-400 transition-colors duration-150 hover:bg-danger-50 hover:text-danger-600 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm font-semibold text-surface-500">남은 단어가 없습니다.</p>
                        )}
                    </div>

                    <div className="border-t border-surface-100 px-4 py-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="block">
                                <span className="mb-1.5 flex items-center gap-1.5 text-xs font-black text-surface-700">
                                    <Folder className="h-4 w-4 text-surface-400" aria-hidden="true" />
                                    저장 폴더
                                </span>
                                <select
                                    value={folderChoice}
                                    onChange={(event) => {
                                        setFolderChoice(event.target.value);
                                        setLocalError('');
                                    }}
                                    disabled={isLocked}
                                    aria-label="저장 폴더"
                                    className="h-11 w-full rounded-md border border-surface-300 bg-white px-3 text-sm font-semibold text-surface-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <option value={NEW_FOLDER_VALUE}>새 폴더 만들기</option>
                                    {folders.map((folder) => (
                                        <option key={folder.id} value={folder.id}>{folder.name}</option>
                                    ))}
                                    <option value={NO_FOLDER_VALUE}>미분류</option>
                                </select>
                            </label>
                            {folderChoice === NEW_FOLDER_VALUE && (
                                <label className="block">
                                    <span className="mb-1.5 block text-xs font-black text-surface-700">새 폴더 이름</span>
                                    <input
                                        type="text"
                                        value={newFolderName}
                                        onChange={(event) => {
                                            setNewFolderName(event.target.value);
                                            setLocalError('');
                                        }}
                                        disabled={isLocked}
                                        maxLength={30}
                                        placeholder="TOEFL"
                                        aria-label="새 폴더 이름"
                                        className="h-11 w-full rounded-md border border-surface-300 bg-surface-50 px-3 text-sm font-semibold text-surface-900 placeholder-surface-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
                                    />
                                </label>
                            )}
                        </div>

                        {localError && (
                            <p className="mt-3 rounded-sm border border-danger-200 bg-danger-50 px-3 py-2 text-xs font-bold text-danger-700" role="alert">
                                {localError}
                            </p>
                        )}

                        {isSaving && (
                            <div className="mt-3 rounded-sm border border-brand-100 bg-brand-50 px-3 py-2.5">
                                <div className="flex items-center justify-between gap-2 text-xs font-black text-brand-700">
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                        {progressLabel(progress)}
                                    </span>
                                    {progress && (
                                        <span className="tabular-nums">{progress.completed} / {progress.total}</span>
                                    )}
                                </div>
                                {progress && progress.total > 0 && (
                                    <div className="mt-2 h-1.5 overflow-hidden rounded-pill bg-brand-100" aria-hidden="true">
                                        <div
                                            className="h-full rounded-pill bg-brand-600 transition-[width] duration-300"
                                            style={{ width: `${Math.min(100, Math.round((progress.completed / progress.total) * 100))}%` }}
                                        />
                                    </div>
                                )}
                                {progress?.currentWord && (
                                    <p className="mt-1.5 truncate text-xs font-semibold text-brand-600">{progress.currentWord}</p>
                                )}
                            </div>
                        )}

                        <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isLocked}>
                                {current.index === 0 ? '가져오지 않기' : '여기서 그만'}
                            </Button>
                            <Button size="sm" onClick={handleSave} loading={isSaving} disabled={isLocked || approvedEntries.length === 0}>
                                {isSaving ? '저장 중' : `${approvedEntries.length}개 저장`}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
