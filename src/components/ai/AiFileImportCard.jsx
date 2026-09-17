import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle, FileText, Folder, FolderPlus, Loader2, Trash2, XCircle } from '../Icons';
import { Button } from '../../design-system';
import { describeImportSummary, getImportBatches } from '../../services/aiImportBatches';
import { getFolderDotClass } from '../../utils/folderColors';

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

const FolderChip = ({ children, dot, icon: Icon, isSelected, onClick, disabled }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-pressed={isSelected}
        className={[
            'inline-flex h-9 max-w-full items-center gap-2 rounded-pill border px-3 text-sm font-bold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60',
            isSelected
                ? 'border-brand-600 bg-brand-600 text-white shadow-[var(--shadow-glow-brand)]'
                : 'border-surface-200 bg-surface-0 text-surface-700 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700',
        ].join(' ')}
    >
        {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />}
        {dot && <span className={['h-2.5 w-2.5 shrink-0 rounded-pill', isSelected ? 'bg-white/90' : dot].join(' ')} aria-hidden="true" />}
        <span className="truncate">{children}</span>
    </button>
);

const ResultBlock = ({ batch, folders, showIndex }) => {
    const result = batch.result;
    const isSaved = result.status === 'saved';
    const folderName = result.folder_name || folders.find((folder) => folder.id === result.folder_id)?.name || '미분류';
    return (
        <div
            className={[
                'flex items-start gap-3 rounded-md border px-4 py-3',
                isSaved ? 'border-success-200 bg-success-50' : 'border-surface-200 bg-surface-50',
            ].join(' ')}
        >
            <span
                className={[
                    'mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-pill',
                    isSaved ? 'bg-success-500 text-white' : 'bg-surface-300 text-white',
                ].join(' ')}
                aria-hidden="true"
            >
                {isSaved ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            </span>
            <div className="min-w-0 flex-1">
                <p className={['text-sm font-black', isSaved ? 'text-success-700' : 'text-surface-600'].join(' ')}>
                    {showIndex ? `${batch.index + 1}번째 묶음 · ` : ''}
                    {isSaved ? `${batch.entries.length}개 → ${folderName}` : '가져오지 않음'}
                </p>
                {isSaved && <p className="mt-0.5 text-xs font-semibold text-success-700/80">{describeImportSummary(result.summary)}</p>}
                {isSaved && result.summary?.failed_words?.length > 0 && (
                    <p className="mt-1 text-xs font-semibold text-danger-600">실패: {result.summary.failed_words.join(', ')}</p>
                )}
            </div>
        </div>
    );
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
    const selectedFolder = folders.find((folder) => String(folder.id) === folderChoice) || null;
    const trimmedFolderName = newFolderName.trim();

    const updateRow = (rowId, field, value) => {
        setRows((prev) => prev.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)));
        setLocalError('');
    };

    const removeRow = (rowId) => {
        setRows((prev) => prev.filter((row) => row.id !== rowId));
        setLocalError('');
    };

    const chooseFolder = (value) => {
        setFolderChoice(value);
        setLocalError('');
    };

    const handleSave = () => {
        if (!current || isLocked) return;
        if (approvedEntries.length === 0) {
            setLocalError('저장할 단어가 없습니다.');
            return;
        }
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
            <div className="flex items-center gap-3 rounded-md border border-surface-200 bg-surface-50 px-4 py-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xs bg-brand-50 text-brand-600" aria-hidden="true">
                    <Loader2 className="h-4 w-4 animate-spin" />
                </span>
                <span className="min-w-0">
                    <span className="block text-sm font-black text-surface-800">단어 읽는 중</span>
                    {payload.file_name && <span className="block truncate text-xs font-semibold text-surface-500">{payload.file_name}</span>}
                </span>
            </div>
        );
    }

    if (message.status === 'failed') {
        return (
            <div className="flex items-start gap-3 rounded-md border border-danger-200 bg-danger-50 px-4 py-3 text-danger-700" role="alert">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-pill bg-danger-500 text-white" aria-hidden="true">
                    <AlertTriangle className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                    <p className="text-sm font-black">{payload.error || '파일에서 단어를 읽지 못했습니다.'}</p>
                    {payload.file_name && <p className="mt-1 text-xs font-semibold text-danger-600">{payload.file_name}</p>}
                </div>
            </div>
        );
    }

    const savePreview = (() => {
        if (approvedEntries.length === 0) return '저장할 단어를 하나 이상 남겨 주세요.';
        if (folderChoice === NEW_FOLDER_VALUE) {
            return trimmedFolderName ? (
                <>새 폴더 <strong className="font-black text-surface-900">{trimmedFolderName}</strong>에 {approvedEntries.length}개를 저장합니다.</>
            ) : '새 폴더 이름을 정해 주세요.';
        }
        if (selectedFolder) {
            return <><strong className="font-black text-surface-900">{selectedFolder.name}</strong> 폴더에 {approvedEntries.length}개를 저장합니다. 이미 있는 단어는 폴더에만 넣습니다.</>;
        }
        return `폴더 없이 ${approvedEntries.length}개를 저장합니다.`;
    })();

    return (
        <div className="space-y-3">
            {batches.completed.map((batch) => (
                <ResultBlock key={batch.index} batch={batch} folders={folders} showIndex={batches.total > 1} />
            ))}

            {current && (
                <div className="overflow-hidden rounded-lg border border-surface-200 bg-surface-0 shadow-[var(--shadow-soft)]">
                    {/* 머리 */}
                    <div className="flex items-start gap-3 px-5 pb-4 pt-4">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-brand-50 text-brand-600" aria-hidden="true">
                            <FileText className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold text-surface-500">
                                파일에서 가져오기{payload.file_name ? ` · ${payload.file_name}` : ''}
                            </p>
                            <h3 className="mt-0.5 text-base font-black tracking-tight text-surface-900">
                                {current.index === 0
                                    ? `${batches.totalEntries}개 단어를 찾았습니다`
                                    : `나머지 ${batches.totalEntries - current.index * batches.batchSize}개 중 다음 ${current.entries.length}개`}
                            </h3>
                            <p className="mt-1 text-xs font-semibold text-surface-500">
                                {batches.total > 1 && current.index === 0
                                    ? `한 번에 ${batches.batchSize}개씩 가져옵니다. 먼저 ${current.entries.length}개를 확인해 주세요.`
                                    : '잘못 읽힌 단어는 고치거나 빼고, 폴더를 정한 뒤 저장하세요.'}
                            </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                            <span className="rounded-pill bg-brand-50 px-2.5 py-1 text-xs font-black tabular-nums text-brand-700">
                                {approvedEntries.length}개
                            </span>
                            {batches.total > 1 && (
                                <span className="text-xs font-semibold tabular-nums text-surface-400">
                                    {current.index + 1} / {batches.total} 묶음
                                </span>
                            )}
                        </div>
                    </div>

                    {/* 단어 표 */}
                    <div className="border-t border-surface-100">
                        <div className="grid grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_2.25rem] items-center gap-x-2 px-3 py-2 text-xs font-bold text-surface-400">
                            <span className="text-center">#</span>
                            <span className="px-2">단어</span>
                            <span className="px-2">뜻</span>
                            <span className="sr-only">빼기</span>
                        </div>
                        <div className="max-h-[22rem] overflow-y-auto border-t border-surface-100">
                            {rows.length > 0 ? (
                                <ul className="divide-y divide-surface-100">
                                    {rows.map((row, index) => (
                                        <li
                                            key={row.id}
                                            className="group grid grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)_2.25rem] items-center gap-x-2 px-3 py-1 transition-colors duration-150 hover:bg-surface-50 focus-within:bg-surface-50"
                                        >
                                            <span className="text-center text-xs font-semibold tabular-nums text-surface-400">{index + 1}</span>
                                            <input
                                                type="text"
                                                value={row.word}
                                                onChange={(event) => updateRow(row.id, 'word', event.target.value)}
                                                disabled={isLocked}
                                                aria-label={`단어 ${index + 1}`}
                                                className="focus-ring-none h-9 min-w-0 rounded-xs border border-transparent bg-transparent px-2 font-serif text-base font-bold text-surface-900 transition-colors duration-150 hover:border-surface-200 focus:border-brand-300 focus:bg-surface-0 disabled:cursor-not-allowed disabled:opacity-60"
                                            />
                                            <input
                                                type="text"
                                                value={row.meaning_ko}
                                                onChange={(event) => updateRow(row.id, 'meaning_ko', event.target.value)}
                                                disabled={isLocked}
                                                placeholder="AI가 채움"
                                                aria-label={`단어 ${index + 1} 뜻`}
                                                className="focus-ring-none h-9 min-w-0 rounded-xs border border-transparent bg-transparent px-2 text-sm font-semibold text-surface-800 placeholder:italic placeholder:text-surface-400 transition-colors duration-150 hover:border-surface-200 focus:border-brand-300 focus:bg-surface-0 disabled:cursor-not-allowed disabled:opacity-60"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeRow(row.id)}
                                                disabled={isLocked}
                                                aria-label={`${row.word || `단어 ${index + 1}`} 빼기`}
                                                className="grid h-8 w-8 place-items-center justify-self-center rounded-xs text-surface-400 transition-[opacity,color,background-color] duration-150 hover:bg-danger-50 hover:text-danger-600 disabled:cursor-not-allowed disabled:opacity-50 lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100"
                                            >
                                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="px-5 py-6 text-center text-sm font-semibold text-surface-500">남은 단어가 없습니다.</p>
                            )}
                        </div>
                    </div>

                    {/* 저장 위치 */}
                    <div className="border-t border-surface-100 bg-surface-50 px-5 py-4">
                        <p className="mb-2.5 flex items-center gap-1.5 text-xs font-bold text-surface-600">
                            <Folder className="h-4 w-4 text-surface-400" aria-hidden="true" />
                            저장 위치
                        </p>
                        <div className="flex flex-wrap gap-2" role="group" aria-label="저장 폴더">
                            <FolderChip
                                icon={FolderPlus}
                                isSelected={folderChoice === NEW_FOLDER_VALUE}
                                onClick={() => chooseFolder(NEW_FOLDER_VALUE)}
                                disabled={isLocked}
                            >
                                새 폴더
                            </FolderChip>
                            {folders.map((folder) => (
                                <FolderChip
                                    key={folder.id}
                                    dot={getFolderDotClass(folder.color)}
                                    isSelected={folderChoice === String(folder.id)}
                                    onClick={() => chooseFolder(String(folder.id))}
                                    disabled={isLocked}
                                >
                                    {folder.name}
                                </FolderChip>
                            ))}
                            <FolderChip
                                isSelected={folderChoice === NO_FOLDER_VALUE}
                                onClick={() => chooseFolder(NO_FOLDER_VALUE)}
                                disabled={isLocked}
                            >
                                미분류
                            </FolderChip>
                        </div>

                        {folderChoice === NEW_FOLDER_VALUE && (
                            <label className="mt-3 block">
                                <span className="sr-only">새 폴더 이름</span>
                                <span className="relative block">
                                    <FolderPlus className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-500" aria-hidden="true" />
                                    <input
                                        type="text"
                                        value={newFolderName}
                                        onChange={(event) => {
                                            setNewFolderName(event.target.value);
                                            setLocalError('');
                                        }}
                                        disabled={isLocked}
                                        maxLength={30}
                                        placeholder="새 폴더 이름"
                                        aria-label="새 폴더 이름"
                                        className="focus-ring-none h-10 w-full rounded-md border border-surface-200 bg-surface-0 pl-9 pr-3 text-sm font-bold text-surface-900 placeholder:font-semibold placeholder:text-surface-400 transition-colors duration-150 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-60 sm:max-w-sm"
                                    />
                                </span>
                            </label>
                        )}

                        <p className="mt-3 text-xs font-semibold leading-5 text-surface-600">{savePreview}</p>

                        {localError && (
                            <p className="mt-3 rounded-sm border border-danger-200 bg-danger-50 px-3 py-2 text-xs font-bold text-danger-700" role="alert">
                                {localError}
                            </p>
                        )}

                        {isSaving && (
                            <div className="mt-3 rounded-md border border-brand-100 bg-surface-0 px-3.5 py-3">
                                <div className="flex items-center justify-between gap-2 text-xs font-black text-brand-700">
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                        {progressLabel(progress)}
                                    </span>
                                    {progress && <span className="tabular-nums">{progress.completed} / {progress.total}</span>}
                                </div>
                                {progress && progress.total > 0 && (
                                    <div className="mt-2 h-1.5 overflow-hidden rounded-pill bg-brand-100" aria-hidden="true">
                                        <div
                                            className="h-full rounded-pill bg-gradient-to-r from-brand-500 to-indigo-pair-600 transition-[width] duration-300"
                                            style={{ width: `${Math.min(100, Math.round((progress.completed / progress.total) * 100))}%` }}
                                        />
                                    </div>
                                )}
                                {progress?.currentWord && (
                                    <p className="mt-1.5 truncate font-serif text-xs font-semibold text-surface-500">{progress.currentWord}</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 액션 */}
                    <div className="flex flex-col-reverse gap-2 border-t border-surface-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isLocked}>
                            {current.index === 0 ? '가져오지 않기' : '여기서 그만'}
                        </Button>
                        <Button size="sm" onClick={handleSave} loading={isSaving} disabled={isLocked || approvedEntries.length === 0}>
                            {isSaving ? '저장 중' : `${approvedEntries.length}개 저장`}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
