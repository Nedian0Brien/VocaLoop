// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import AiFileImportCard from './AiFileImportCard';

const folders = [
    { id: 1, name: 'TOEFL', color: 'blue', icon: null, order: 0 },
    { id: 2, name: 'GRE', color: 'blue', icon: null, order: 1 },
];

const importMessage = (overrides = {}, payloadOverrides = {}) => ({
    id: 9,
    conversation_id: 3,
    role: 'assistant',
    kind: 'file_import',
    content: '',
    status: 'ready',
    payload: {
        file_name: 'words.csv',
        batch_size: 2,
        entries: [
            { word: 'abate', meaning_ko: '줄이다' },
            { word: 'candid', meaning_ko: null },
            { word: 'ephemeral', meaning_ko: '덧없는' },
        ],
        results: [],
        suggested_folder_name: 'TOEFL Day 1',
        target_folder_id: null,
        ...payloadOverrides,
    },
    created_at: '2026-09-17T00:00:00Z',
    updated_at: '2026-09-17T00:00:00Z',
    ...overrides,
});

const renderCard = (message, props = {}) => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    const utils = render(
        <AiFileImportCard message={message} folders={folders} onSave={onSave} onCancel={onCancel} {...props} />
    );
    return { ...utils, onSave, onCancel };
};

describe('AiFileImportCard', () => {
    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    test('shows the reading state while extraction is pending', () => {
        renderCard(importMessage({ status: 'pending' }));

        expect(screen.getByText('단어 읽는 중')).toBeTruthy();
        expect(screen.queryByRole('button', { name: /저장/ })).toBeNull();
    });

    test('shows the server error when extraction failed', () => {
        renderCard(importMessage({ status: 'failed' }, { error: '텍스트가 없는 PDF입니다.' }));

        expect(screen.getByRole('alert').textContent).toContain('텍스트가 없는 PDF입니다.');
    });

    test('renders the first batch with editable rows and a suggested new folder', () => {
        renderCard(importMessage());

        expect(screen.getByText('3개 단어를 찾았습니다')).toBeTruthy();
        expect(screen.getByLabelText('단어 1').value).toBe('abate');
        expect(screen.getByLabelText('단어 1 뜻').value).toBe('줄이다');
        expect(screen.getByLabelText('단어 2 뜻').value).toBe('');
        expect(screen.queryByLabelText('단어 3')).toBeNull();
        expect(screen.getByLabelText('저장 폴더').value).toBe('__new__');
        expect(screen.getByLabelText('새 폴더 이름').value).toBe('TOEFL Day 1');
    });

    test('preselects the folder the user named in the message', () => {
        renderCard(importMessage({}, { target_folder_id: 2 }));

        expect(screen.getByLabelText('저장 폴더').value).toBe('2');
        expect(screen.queryByLabelText('새 폴더 이름')).toBeNull();
    });

    test('save passes only approved rows with edits applied and the new folder name', () => {
        const { onSave } = renderCard(importMessage());

        fireEvent.change(screen.getByLabelText('단어 2'), { target: { value: 'candor' } });
        fireEvent.change(screen.getByLabelText('단어 2 뜻'), { target: { value: ' 솔직함 ' } });
        fireEvent.change(screen.getByLabelText('새 폴더 이름'), { target: { value: 'Day 1' } });
        fireEvent.click(screen.getByRole('button', { name: '2개 저장' }));

        expect(onSave).toHaveBeenCalledWith({
            message: expect.objectContaining({ id: 9 }),
            batchIndex: 0,
            entries: [
                { word: 'abate', meaning_ko: '줄이다' },
                { word: 'candor', meaning_ko: '솔직함' },
            ],
            folderId: null,
            newFolderName: 'Day 1',
        });
    });

    test('removing a row shrinks the approved count and an empty list cannot be saved', () => {
        const { onSave } = renderCard(importMessage());

        fireEvent.click(screen.getByRole('button', { name: 'abate 빼기' }));
        fireEvent.click(screen.getByRole('button', { name: 'candid 빼기' }));

        expect(screen.getByText('남은 단어가 없습니다.')).toBeTruthy();
        expect(screen.getByRole('button', { name: '0개 저장' }).disabled).toBe(true);
        expect(onSave).not.toHaveBeenCalled();
    });

    test('requires a name when saving into a new folder', () => {
        const { onSave } = renderCard(importMessage({}, { suggested_folder_name: null }));

        fireEvent.click(screen.getByRole('button', { name: '2개 저장' }));

        expect(screen.getByRole('alert').textContent).toContain('새 폴더 이름을 입력해 주세요.');
        expect(onSave).not.toHaveBeenCalled();
    });

    test('saving into an existing folder passes its id', () => {
        const { onSave } = renderCard(importMessage());

        fireEvent.change(screen.getByLabelText('저장 폴더'), { target: { value: '1' } });
        fireEvent.click(screen.getByRole('button', { name: '2개 저장' }));

        expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ folderId: 1, newFolderName: '' }));
    });

    test('shows the completed batch summary and continues into the same folder for the next batch', () => {
        renderCard(
            importMessage({}, {
                results: [
                    {
                        batch_index: 0,
                        status: 'saved',
                        folder_id: 1,
                        folder_name: 'TOEFL',
                        summary: { created: 1, assigned: 0, skipped: 1, failed: 0, failed_words: [] },
                    },
                ],
            })
        );

        expect(screen.getByText('1번째 묶음 · 2개 → TOEFL')).toBeTruthy();
        expect(screen.getByText('1개 저장 · 1개 중복 건너뜀')).toBeTruthy();
        expect(screen.getByText('나머지 1개 중 다음 1개')).toBeTruthy();
        expect(screen.getByLabelText('단어 1').value).toBe('ephemeral');
        expect(screen.getByLabelText('저장 폴더').value).toBe('1');
        expect(screen.getByRole('button', { name: '여기서 그만' })).toBeTruthy();
    });

    test('cancel asks for confirmation and reports the current batch index', () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        const { onCancel } = renderCard(importMessage());

        fireEvent.click(screen.getByRole('button', { name: '가져오지 않기' }));

        expect(window.confirm).toHaveBeenCalled();
        expect(onCancel).toHaveBeenCalledWith({ message: expect.objectContaining({ id: 9 }), batchIndex: 0 });
    });

    test('shows only summaries once every batch is recorded', () => {
        renderCard(
            importMessage({ status: 'done' }, {
                results: [
                    { batch_index: 0, status: 'saved', folder_id: 1, folder_name: 'TOEFL', summary: { created: 2, assigned: 0, skipped: 0, failed: 0, failed_words: [] } },
                    { batch_index: 1, status: 'cancelled', folder_id: null, folder_name: null, summary: null },
                ],
            })
        );

        expect(screen.getByText('1번째 묶음 · 2개 → TOEFL')).toBeTruthy();
        expect(screen.getByText('2번째 묶음 · 가져오지 않음')).toBeTruthy();
        expect(screen.queryByRole('button', { name: /저장/ })).toBeNull();
    });

    test('locks the editor and shows progress while saving', () => {
        renderCard(importMessage(), {
            isSaving: true,
            progress: { phase: 'analyzing', completed: 1, total: 2, currentWord: 'candid' },
        });

        const status = screen.getByText('AI가 뜻·예문을 채우는 중');
        expect(within(status.parentElement).getByText('1 / 2')).toBeTruthy();
        expect(screen.getByLabelText('단어 1').disabled).toBe(true);
        expect(screen.getByRole('button', { name: '저장 중' }).disabled).toBe(true);
    });
});
