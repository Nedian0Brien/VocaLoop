// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const vocabularyImportApi = vi.hoisted(() => ({
  extractWordsFromScreenshot: vi.fn(),
}));

vi.mock('../services/vocabularyImportApi', () => vocabularyImportApi);

import ScreenshotWordImportModal from './ScreenshotWordImportModal';

const baseProps = {
  defaultFolderId: null,
  folders: [
    { id: 3, name: 'TOEFL' },
    { id: 5, name: 'Daily' },
  ],
  isOpen: true,
  onClose: vi.fn(),
  onSubmit: vi.fn(),
  progress: null,
};

const renderModal = (props = {}) => render(<ScreenshotWordImportModal {...baseProps} {...props} />);

describe('ScreenshotWordImportModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vocabularyImportApi.extractWordsFromScreenshot.mockResolvedValue({
      words: ['abate', 'candid'],
      suggested_folder_name: 'TOEFL',
    });
    baseProps.onSubmit.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
  });

  test('extracts words from an uploaded screenshot', async () => {
    renderModal();

    const file = new File(['fake image'], 'words.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('단어장 이미지'), { target: { files: [file] } });

    await waitFor(() => expect(vocabularyImportApi.extractWordsFromScreenshot).toHaveBeenCalledWith(file));
    expect(await screen.findByDisplayValue('abate')).toBeTruthy();
    expect(screen.getByDisplayValue('candid')).toBeTruthy();
    expect(screen.getByDisplayValue('TOEFL')).toBeTruthy();
  });

  test('submits only approved edited words', async () => {
    renderModal();

    fireEvent.change(screen.getByLabelText('단어장 이미지'), {
      target: { files: [new File(['fake image'], 'words.png', { type: 'image/png' })] },
    });

    const abateInput = await screen.findByDisplayValue('abate');
    fireEvent.change(abateInput, { target: { value: 'abatee' } });
    fireEvent.click(screen.getByRole('button', { name: 'candid 제거' }));
    fireEvent.change(screen.getByLabelText('저장 폴더'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: '1개 저장' }));

    await waitFor(() => expect(baseProps.onSubmit).toHaveBeenCalledTimes(1));
    expect(baseProps.onSubmit).toHaveBeenCalledWith({
      words: ['abatee'],
      folderId: 3,
      newFolderName: '',
    });
  });

  test('requires a new folder name before saving to a new folder', async () => {
    renderModal();

    fireEvent.change(screen.getByLabelText('단어장 이미지'), {
      target: { files: [new File(['fake image'], 'words.png', { type: 'image/png' })] },
    });

    await screen.findByDisplayValue('abate');
    fireEvent.change(screen.getByLabelText('저장 폴더'), { target: { value: '__new__' } });
    fireEvent.click(screen.getByRole('button', { name: '2개 저장' }));

    expect(await screen.findByText('새 폴더 이름을 입력해 주세요.')).toBeTruthy();
    expect(baseProps.onSubmit).not.toHaveBeenCalled();
  });

  test('blocks saving when every extracted word is removed', async () => {
    renderModal();

    fireEvent.change(screen.getByLabelText('단어장 이미지'), {
      target: { files: [new File(['fake image'], 'words.png', { type: 'image/png' })] },
    });

    await screen.findByDisplayValue('abate');
    fireEvent.click(screen.getByRole('button', { name: 'abate 제거' }));
    fireEvent.click(screen.getByRole('button', { name: 'candid 제거' }));

    const saveButton = screen.getByRole('button', { name: '0개 저장' });
    expect(saveButton.disabled).toBe(true);
    fireEvent.click(saveButton);
    expect(baseProps.onSubmit).not.toHaveBeenCalled();
  });

  test('shows a concise extraction error', async () => {
    vocabularyImportApi.extractWordsFromScreenshot.mockRejectedValueOnce(new Error('Codex exploded'));
    renderModal();

    fireEvent.change(screen.getByLabelText('단어장 이미지'), {
      target: { files: [new File(['fake image'], 'words.png', { type: 'image/png' })] },
    });

    expect(await screen.findByText('이미지에서 단어를 읽지 못했습니다.')).toBeTruthy();
  });
});
