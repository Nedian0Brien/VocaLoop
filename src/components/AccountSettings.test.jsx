// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const settingsApi = vi.hoisted(() => ({
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
}));

const uploadApi = vi.hoisted(() => ({
    uploadProfileImage: vi.fn(),
    deleteProfileImage: vi.fn(),
}));

const accountApi = vi.hoisted(() => ({
    resetAccountData: vi.fn(),
    deleteAccount: vi.fn(),
}));

vi.mock('../services/settingsApi', () => settingsApi);
vi.mock('../services/uploadApi', () => uploadApi);
vi.mock('../services/accountApi', () => accountApi);

import AccountSettings from './AccountSettings';

const baseProps = {
    user: {
        email: 'user@example.com',
        displayName: 'Initial User',
        photoURL: '/uploads/profile/old.png',
        metadata: { creationTime: '2026-04-01T00:00:00Z' },
    },
    words: [
        {
            id: 1,
            word: 'serendipity',
            status: 'NEW',
            stats: { wrong_count: 0, review_count: 0 },
        },
    ],
    folders: [
        {
            id: 10,
            name: 'Core',
            color: '#2563EB',
            order: 0,
        },
    ],
    onClose: vi.fn(),
    onLogout: vi.fn(),
    showNotification: vi.fn(),
    onCreateFolder: vi.fn(),
    onRenameFolder: vi.fn(),
    onDeleteFolder: vi.fn(),
    aiSettings: {
        provider: 'openai',
        model: 'gpt-4.1',
        geminiApiKey: '',
        openaiApiKey: 'loaded-openai-key',
        claudeApiKey: '',
    },
    onAiSettingsChange: vi.fn(),
    onUserUpdate: vi.fn(),
    onDataReset: vi.fn(),
    onAccountDeleted: vi.fn(),
};

describe('AccountSettings backend migration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        settingsApi.getSettings.mockResolvedValue({
            displayName: 'Loaded User',
            toeflTarget: 110,
            provider: 'openai',
            model: 'gpt-4.1',
            geminiApiKey: null,
            openaiApiKey: 'loaded-openai-key',
            claudeApiKey: null,
        });
        uploadApi.uploadProfileImage.mockResolvedValue({ photo_url: '/uploads/profile/new.png' });
        uploadApi.deleteProfileImage.mockResolvedValue({ photo_url: null });
        accountApi.resetAccountData.mockResolvedValue({ deleted_words: 1, deleted_folders: 1 });
        accountApi.deleteAccount.mockResolvedValue({ detail: 'Account deleted' });
    });

    afterEach(() => {
        cleanup();
    });

    test('loads backend settings and saves profile updates through the API', async () => {
        render(<AccountSettings {...baseProps} />);

        await waitFor(() => expect(settingsApi.getSettings).toHaveBeenCalledTimes(1));

        expect(screen.getByDisplayValue('Loaded User')).toBeTruthy();
        expect(screen.getByDisplayValue('110')).toBeTruthy();

        fireEvent.change(screen.getByPlaceholderText('이름을 입력하세요'), { target: { value: 'Updated User' } });
        fireEvent.change(screen.getByPlaceholderText('예: 100'), { target: { value: '115' } });
        fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'openai' } });
        fireEvent.change(screen.getByPlaceholderText('OpenAI API Keys에서 발급받은 키 입력'), {
            target: { value: 'test-openai-key' },
        });
        await waitFor(() => {
            expect(screen.getAllByRole('combobox')[0].value).toBe('openai');
            expect(screen.getByPlaceholderText('OpenAI API Keys에서 발급받은 키 입력').value).toBe('test-openai-key');
        });
        fireEvent.click(screen.getByRole('button', { name: '프로필 저장' }));

        await waitFor(() => expect(settingsApi.updateSettings).toHaveBeenCalledTimes(1));
        expect(settingsApi.updateSettings.mock.calls[0][0]).toEqual(
            expect.objectContaining({
                displayName: 'Updated User',
                toeflTarget: 115,
            })
        );
        expect(baseProps.onAiSettingsChange).toHaveBeenCalledTimes(1);
        expect(baseProps.onUserUpdate).toHaveBeenCalledWith({ displayName: 'Updated User' });
    });

    test('uploads and removes profile photo through the backend API', async () => {
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
        render(<AccountSettings {...baseProps} />);

        await waitFor(() => expect(settingsApi.getSettings).toHaveBeenCalledTimes(1));

        const fileInput = document.querySelector('input[type="file"]');
        const file = new File([new Uint8Array([1, 2, 3])], 'avatar.png', { type: 'image/png' });
        fireEvent.change(fileInput, { target: { files: [file] } });

        await waitFor(() => expect(uploadApi.uploadProfileImage).toHaveBeenCalledTimes(1));
        expect(baseProps.onUserUpdate).toHaveBeenCalledWith({ photoURL: '/uploads/profile/new.png' });

        fireEvent.click(screen.getByRole('button', { name: '사진 제거' }));

        await waitFor(() => expect(uploadApi.deleteProfileImage).toHaveBeenCalledTimes(1));
        expect(baseProps.onUserUpdate).toHaveBeenCalledWith({ photoURL: null });
        confirmSpy.mockRestore();
    });

    test('resets data and deletes the account through backend endpoints', async () => {
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

        render(<AccountSettings {...baseProps} />);

        await waitFor(() => expect(settingsApi.getSettings).toHaveBeenCalledTimes(1));

        fireEvent.click(screen.getByRole('button', { name: '데이터' }));
        fireEvent.click(screen.getByRole('button', { name: '모든 데이터 삭제' }));

        await waitFor(() => expect(accountApi.resetAccountData).toHaveBeenCalledTimes(1));
        expect(baseProps.onDataReset).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByRole('button', { name: '계정' }));
        fireEvent.click(screen.getByRole('button', { name: '회원 탈퇴' }));
        fireEvent.change(screen.getByPlaceholderText('비밀번호를 입력하세요'), {
            target: { value: 'Password123!' },
        });
        fireEvent.click(screen.getByRole('button', { name: '확인 - 계정 삭제' }));

        await waitFor(() => expect(accountApi.deleteAccount).toHaveBeenCalledWith({ password: 'Password123!' }));
        expect(baseProps.onAccountDeleted).toHaveBeenCalledTimes(1);
        expect(baseProps.onClose).toHaveBeenCalledTimes(1);

        confirmSpy.mockRestore();
    });
});
