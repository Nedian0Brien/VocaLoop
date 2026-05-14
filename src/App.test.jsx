// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const authApi = vi.hoisted(() => ({
    getCurrentUser: vi.fn(),
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
}));

const settingsApi = vi.hoisted(() => ({
    getSettings: vi.fn(),
}));

const wordApi = vi.hoisted(() => ({
    listWords: vi.fn(),
    createWord: vi.fn(),
    updateWord: vi.fn(),
    deleteWord: vi.fn(),
}));

const folderApi = vi.hoisted(() => ({
    listFolders: vi.fn(),
    createFolder: vi.fn(),
    updateFolder: vi.fn(),
    deleteFolder: vi.fn(),
    reorderFolders: vi.fn(),
}));

const geminiService = vi.hoisted(() => ({
    generateWordData: vi.fn(),
}));

vi.mock('./services/authApi', () => authApi);
vi.mock('./services/settingsApi', () => settingsApi);
vi.mock('./services/wordApi', () => wordApi);
vi.mock('./services/folderApi', () => folderApi);

vi.mock('./hooks/useWindowSize', () => ({
    default: () => ({ width: 1280, height: 720 }),
}));

vi.mock('./services/geminiService', () => geminiService);

vi.mock('./components/Header', () => ({
    default: ({ user }) => <div data-testid="header">header:{user?.email}</div>,
}));

vi.mock('./components/LoginScreen', () => ({
    default: ({ onEmailLogin, onEmailSignup, isLoading }) => (
        <div>
            <div>login-screen</div>
            <button
                type="button"
                onClick={() => onEmailLogin('user@example.com', 'Password123!')}
                disabled={isLoading}
            >
                mock-login
            </button>
            <button
                type="button"
                onClick={() => onEmailSignup('new@example.com', 'Password123!')}
                disabled={isLoading}
            >
                mock-signup
            </button>
        </div>
    ),
}));

vi.mock('./components/WordCard', () => ({
    default: ({ item, onMoveWord }) => (
        <div>
            <div>{item.word}</div>
            <div>folder:{item.folderId ?? 'none'}</div>
            <button type="button" onClick={() => onMoveWord(item.id, 201)}>
                mock-move-word
            </button>
        </div>
    ),
}));

vi.mock('./components/EmptyState', () => ({
    default: () => <div>empty-state</div>,
}));

vi.mock('./components/QuizView', () => ({
    default: () => <div>quiz-view</div>,
}));

vi.mock('./components/ToeflReviewView', () => ({
    default: () => <div>review-view</div>,
}));

vi.mock('./components/FolderSidebar', () => ({
    default: ({ folders, onCreateFolder, onDeleteFolder }) => (
        <div data-testid="folder-sidebar">
            <div>folders:{folders?.length ?? 0}</div>
            <button type="button" onClick={() => onCreateFolder('New Folder', '#123456', 'folder')}>
                mock-create-folder
            </button>
            <button type="button" onClick={() => onDeleteFolder(301)}>
                mock-delete-folder
            </button>
        </div>
    ),
}));

vi.mock('./components/CompactFolderPicker', () => ({
    default: () => <div>compact-folder-picker</div>,
}));

vi.mock('./components/AccountSettings', () => ({
    default: () => <div>account-settings</div>,
}));

vi.mock('./components/LearningRateDonut', () => ({
    default: () => <div>learning-rate-donut</div>,
}));

import App from './App';
import { resetDictionaryAutocompleteCache } from './services/dictionaryAutocompleteService';

describe('App backend session bootstrap', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ entries: [] }),
        }));
    });

    afterEach(() => {
        vi.restoreAllMocks();
        cleanup();
        vi.unstubAllGlobals();
        resetDictionaryAutocompleteCache();
    });

    test('authenticated backend session on startup reaches the logged-in app state', async () => {
        authApi.getCurrentUser.mockResolvedValue({
            user: { id: 1, email: 'user@example.com', display_name: 'User' },
        });
        settingsApi.getSettings.mockResolvedValue({
            displayName: 'User',
            provider: 'gemini',
            model: 'gemini-2.0-flash',
            toeflTarget: null,
            geminiApiKey: 'test-key',
            openaiApiKey: null,
            claudeApiKey: null,
        });
        wordApi.listWords.mockResolvedValue([
            { id: 101, word: 'serendipity', createdAt: '2026-04-01T00:00:00Z', learningRate: 0, stats: { wrong_count: 0, review_count: 0 } },
        ]);
        folderApi.listFolders.mockResolvedValue([
            { id: 201, name: 'Core', color: '#2563EB', order: 0 },
        ]);

        render(<App />);

        await waitFor(() => {
            expect(authApi.getCurrentUser).toHaveBeenCalledTimes(1);
        });

        expect((await screen.findByTestId('header')).textContent).toContain('user@example.com');
        expect(screen.getByText('Add New Word')).toBeTruthy();
        expect(settingsApi.getSettings).toHaveBeenCalledTimes(1);
        expect(wordApi.listWords).toHaveBeenCalledTimes(1);
        expect(folderApi.listFolders).toHaveBeenCalledTimes(1);
    });

    test('unauthenticated startup renders the login screen without legacy config', async () => {
        authApi.getCurrentUser.mockRejectedValue({ status: 401, message: 'Not authenticated' });

        render(<App />);

        expect(await screen.findByText('login-screen')).toBeTruthy();

        expect(authApi.getCurrentUser).toHaveBeenCalledTimes(1);
        expect(settingsApi.getSettings).not.toHaveBeenCalled();
        expect(wordApi.listWords).not.toHaveBeenCalled();
        expect(folderApi.listFolders).not.toHaveBeenCalled();
        expect(screen.queryByText('setup-screen')).toBeNull();
    });

    test('login keeps the app on the login screen until hydration succeeds', async () => {
        authApi.getCurrentUser.mockRejectedValue({ status: 401, message: 'Not authenticated' });
        authApi.login.mockResolvedValue({
            user: { id: 1, email: 'login@example.com', display_name: 'Login User' },
        });
        settingsApi.getSettings.mockResolvedValue({
            displayName: 'Login User',
            provider: 'gemini',
            model: 'gemini-2.0-flash',
            toeflTarget: null,
            geminiApiKey: null,
            openaiApiKey: null,
            claudeApiKey: null,
        });
        wordApi.listWords.mockResolvedValue([]);
        folderApi.listFolders.mockResolvedValue([]);

        render(<App />);

        expect(await screen.findByText('login-screen')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'mock-login' }));

        await waitFor(() => {
            expect(authApi.login).toHaveBeenCalledWith({
                email: 'user@example.com',
                password: 'Password123!',
            });
            expect(settingsApi.getSettings).toHaveBeenCalledTimes(1);
        });

        expect(await screen.findByTestId('header')).toBeTruthy();
        expect(screen.queryByText('login-screen')).toBeNull();
    });

    test('login hydration failure keeps the login screen visible', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
        authApi.getCurrentUser.mockRejectedValue({ status: 401, message: 'Not authenticated' });
        authApi.login.mockResolvedValue({
            user: { id: 1, email: 'login@example.com', display_name: 'Login User' },
        });
        settingsApi.getSettings.mockRejectedValue(new Error('settings failed'));
        wordApi.listWords.mockResolvedValue([]);
        folderApi.listFolders.mockResolvedValue([]);

        render(<App />);

        expect(await screen.findByText('login-screen')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'mock-login' }));

        await waitFor(() => {
            expect(authApi.login).toHaveBeenCalledTimes(1);
            expect(settingsApi.getSettings).toHaveBeenCalledTimes(1);
        });

        expect(screen.queryByTestId('header')).toBeNull();
        expect(screen.getByText('login-screen')).toBeTruthy();
        expect(consoleError).toHaveBeenCalledWith('Email Login Error:', expect.any(Error));
    });

    test('signup keeps the app on the login screen until hydration succeeds', async () => {
        authApi.getCurrentUser.mockRejectedValue({ status: 401, message: 'Not authenticated' });
        authApi.signup.mockResolvedValue({
            user: { id: 2, email: 'signup@example.com', display_name: 'Signup User' },
        });
        settingsApi.getSettings.mockResolvedValue({
            displayName: 'Signup User',
            provider: 'gemini',
            model: 'gemini-2.0-flash',
            toeflTarget: null,
            geminiApiKey: null,
            openaiApiKey: null,
            claudeApiKey: null,
        });
        wordApi.listWords.mockResolvedValue([]);
        folderApi.listFolders.mockResolvedValue([]);

        render(<App />);

        expect(await screen.findByText('login-screen')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'mock-signup' }));

        await waitFor(() => {
            expect(authApi.signup).toHaveBeenCalledWith({
                email: 'new@example.com',
                password: 'Password123!',
            });
            expect(settingsApi.getSettings).toHaveBeenCalledTimes(1);
        });

        expect(await screen.findByTestId('header')).toBeTruthy();
        expect(screen.queryByText('login-screen')).toBeNull();
    });

    test('signup hydration failure keeps the login screen visible', async () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
        authApi.getCurrentUser.mockRejectedValue({ status: 401, message: 'Not authenticated' });
        authApi.signup.mockResolvedValue({
            user: { id: 2, email: 'signup@example.com', display_name: 'Signup User' },
        });
        settingsApi.getSettings.mockRejectedValue(new Error('settings failed'));
        wordApi.listWords.mockResolvedValue([]);
        folderApi.listFolders.mockResolvedValue([]);

        render(<App />);

        expect(await screen.findByText('login-screen')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'mock-signup' }));

        await waitFor(() => {
            expect(authApi.signup).toHaveBeenCalledTimes(1);
            expect(settingsApi.getSettings).toHaveBeenCalledTimes(1);
        });

        expect(screen.queryByTestId('header')).toBeNull();
        expect(screen.getByText('login-screen')).toBeTruthy();
        expect(consoleError).toHaveBeenCalledWith('Email Signup Error:', expect.any(Error));
    });

    test('folder and word mutations go through backend apis and update local state', async () => {
        authApi.getCurrentUser.mockResolvedValue({
            user: { id: 1, email: 'user@example.com', display_name: 'User' },
        });
        geminiService.generateWordData.mockResolvedValue({
            word: 'Serendipity',
            meaning_ko: '뜻밖의 행운',
            pronunciation: '/ˌser.ənˈdɪp.ə.ti/',
            pos: 'Noun',
            definitions: ['The occurrence and development of events by chance in a happy or beneficial way.'],
            definitions_ko: ['행운이나 유익한 방향으로 우연히 사건이 발생하고 전개되는 것.'],
            examples: [{ en: 'Finding this restaurant was a pure serendipity.', ko: '이 식당을 발견한 것은 정말 뜻밖의 행운이었다.' }],
            synonyms: ['chance'],
            nuance: 'positive',
        });
        settingsApi.getSettings.mockResolvedValue({
            displayName: 'User',
            provider: 'gemini',
            model: 'gemini-2.0-flash',
            toeflTarget: null,
            geminiApiKey: null,
            openaiApiKey: null,
            claudeApiKey: null,
        });
        wordApi.listWords.mockResolvedValue([
            {
                id: 101,
                word: 'serendipity',
                folder_id: null,
                created_at: '2026-04-01T00:00:00Z',
                learning_rate: 0,
                stats: { wrong_count: 0, review_count: 0 },
            },
        ]);
        wordApi.updateWord.mockResolvedValue({
            id: 101,
            word: 'serendipity',
            folder_id: 201,
            created_at: '2026-04-01T00:00:00Z',
            learning_rate: 0,
            stats: { wrong_count: 0, review_count: 0 },
        });
        folderApi.listFolders.mockResolvedValue([
            { id: 301, name: 'Core', color: '#2563EB', order: 0, created_at: '2026-04-01T00:00:00Z' },
        ]);
        folderApi.createFolder.mockResolvedValue({
            id: 302,
            name: 'New Folder',
            color: '#123456',
            icon: 'folder',
            order: 1,
            created_at: '2026-04-02T00:00:00Z',
        });

        render(<App />);

        expect(await screen.findByTestId('header')).toBeTruthy();
        expect(screen.getByTestId('folder-sidebar').textContent).toContain('folders:1');
        expect(screen.getByText('folder:none')).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'mock-create-folder' }));

        await waitFor(() => {
            expect(folderApi.createFolder).toHaveBeenCalledWith({
                name: 'New Folder',
                color: '#123456',
                icon: 'folder',
            });
        });

        expect(screen.getByTestId('folder-sidebar').textContent).toContain('folders:2');

        fireEvent.click(screen.getByRole('button', { name: 'mock-move-word' }));

        await waitFor(() => {
            expect(wordApi.updateWord).toHaveBeenCalledWith(101, { folder_id: 201 });
        });

        expect(screen.getByText('folder:201')).toBeTruthy();
    });

    test('add word sends a numeric folder id and clears stale folder selection after folder deletion', async () => {
        authApi.getCurrentUser.mockResolvedValue({
            user: { id: 1, email: 'user@example.com', display_name: 'User' },
        });
        geminiService.generateWordData.mockResolvedValue({
            word: 'Ephemeral',
            meaning_ko: '덧없는',
            pronunciation: '/ɪˈfem.ər.əl/',
            pos: 'Adjective',
            definitions: ['Lasting for a very short time.'],
            definitions_ko: ['매우 짧은 시간 동안만 지속되는.'],
            examples: [{ en: 'A candle flame is ephemeral.', ko: '촛불의 불꽃은 덧없다.' }],
            synonyms: ['fleeting'],
            nuance: 'neutral',
        });
        settingsApi.getSettings.mockResolvedValue({
            displayName: 'User',
            provider: 'gemini',
            model: 'gemini-2.0-flash',
            toeflTarget: null,
            geminiApiKey: null,
            openaiApiKey: null,
            claudeApiKey: null,
        });
        wordApi.listWords.mockResolvedValue([]);
        wordApi.createWord.mockResolvedValueOnce({
            id: 102,
            word: 'Ephemeral',
            folder_id: 301,
            created_at: '2026-04-02T00:00:00Z',
            learning_rate: 0,
            stats: { wrong_count: 0, review_count: 0 },
        });
        wordApi.createWord.mockResolvedValueOnce({
            id: 102,
            word: 'Ephemeral',
            folder_id: null,
            created_at: '2026-04-02T00:00:00Z',
            learning_rate: 0,
            stats: { wrong_count: 0, review_count: 0 },
        });
        folderApi.listFolders.mockResolvedValue([
            { id: 301, name: 'Core', color: '#2563EB', order: 0, created_at: '2026-04-01T00:00:00Z' },
        ]);
        folderApi.deleteFolder.mockResolvedValue(undefined);

        render(<App />);

        expect(await screen.findByTestId('header')).toBeTruthy();

        fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: '301' } });
        fireEvent.change(screen.getByPlaceholderText('Enter an English word (e.g., Epiphany)'), {
            target: { value: 'Ephemeral' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

        await waitFor(() => {
            expect(wordApi.createWord).toHaveBeenCalledWith(
                expect.objectContaining({
                    folder_id: 301,
                }),
            );
        });

        fireEvent.click(screen.getByRole('button', { name: 'mock-delete-folder' }));

        await waitFor(() => {
            expect(folderApi.deleteFolder).toHaveBeenCalledWith(301);
        });

        fireEvent.change(screen.getByPlaceholderText('Enter an English word (e.g., Epiphany)'), {
            target: { value: 'Ephemeral' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

        await waitFor(() => {
            expect(wordApi.createWord).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    folder_id: null,
                }),
            );
        });
    });

    test('does not emit React key warnings while rendering the generating word card', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        authApi.getCurrentUser.mockResolvedValue({
            user: { id: 1, email: 'user@example.com', display_name: 'User' },
        });
        settingsApi.getSettings.mockResolvedValue({
            displayName: 'User',
            provider: 'gemini',
            model: 'gemini-2.0-flash',
            toeflTarget: null,
            geminiApiKey: 'test-key',
            openaiApiKey: null,
            claudeApiKey: null,
        });
        wordApi.listWords.mockResolvedValue([]);
        folderApi.listFolders.mockResolvedValue([]);
        geminiService.generateWordData.mockImplementation(
            () => new Promise(() => {}),
        );

        render(<App />);

        const input = await screen.findByPlaceholderText('Enter an English word (e.g., Epiphany)');
        fireEvent.change(input, { target: { value: 'Ephemeral' } });
        fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

        await screen.findByText('단어 생성 중...');

        const keyWarning = consoleErrorSpy.mock.calls.find((call) =>
            String(call[0] || '').includes('Each child in a list should have a unique "key" prop')
        );
        consoleErrorSpy.mockRestore();
        expect(keyWarning).toBeUndefined();
    });

    test('suggests words from the English-Korean dictionary instead of saved vocabulary', async () => {
        authApi.getCurrentUser.mockResolvedValue({
            user: { id: 1, email: 'user@example.com', display_name: 'User' },
        });
        settingsApi.getSettings.mockResolvedValue({
            displayName: 'User',
            provider: 'gemini',
            model: 'gemini-2.0-flash',
            toeflTarget: null,
            geminiApiKey: 'test-key',
            openaiApiKey: null,
            claudeApiKey: null,
        });
        wordApi.listWords.mockResolvedValue([
            {
                id: 101,
                word: 'Serendipity',
                meaning_ko: '뜻밖의 발견',
                created_at: '2026-04-01T00:00:00Z',
                learning_rate: 0,
                stats: { wrong_count: 0, review_count: 0 },
            },
        ]);
        folderApi.listFolders.mockResolvedValue([]);
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                source: 'test dictionary',
                entries: [
                    { word: 'Epiphany', meaning_ko: '깨달음', pos: 'noun' },
                    { word: 'Epidemic', meaning_ko: '유행병', pos: 'noun' },
                ],
            }),
        }));

        render(<App />);

        const input = await screen.findByPlaceholderText('Enter an English word (e.g., Epiphany)');

        fireEvent.change(input, { target: { value: 'ser' } });

        await waitFor(() => {
            expect(fetch).toHaveBeenCalledWith('/dictionaries/en-ko-autocomplete.json', expect.any(Object));
        });
        expect(screen.queryByRole('listbox', { name: '단어 자동완성 제안' })).toBeNull();

        fireEvent.change(input, { target: { value: 'epi' } });

        const listbox = await screen.findByRole('listbox', { name: '단어 자동완성 제안' });
        expect(listbox.dataset.portalRoot).toBe('document-body');
        expect(screen.getByRole('option', { name: /Epiphany 자동완성 선택/ })).toBeTruthy();
        expect(screen.getByRole('option', { name: /Epidemic 자동완성 선택/ })).toBeTruthy();
        expect(screen.queryByRole('option', { name: /Serendipity 자동완성 선택/ })).toBeNull();

        fireEvent.click(screen.getByRole('option', { name: /Epiphany 자동완성 선택/ }));

        expect(input.value).toBe('Epiphany');
        expect(screen.queryByRole('listbox', { name: '단어 자동완성 제안' })).toBeNull();
    });

    test('keeps dictionary suggestions above the clipped add word card', async () => {
        authApi.getCurrentUser.mockResolvedValue({
            user: { id: 1, email: 'user@example.com', display_name: 'User' },
        });
        settingsApi.getSettings.mockResolvedValue({
            displayName: 'User',
            provider: 'gemini',
            model: 'gemini-2.0-flash',
            toeflTarget: null,
            geminiApiKey: 'test-key',
            openaiApiKey: null,
            claudeApiKey: null,
        });
        wordApi.listWords.mockResolvedValue([]);
        folderApi.listFolders.mockResolvedValue([]);
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                entries: [
                    { word: 'Academic', meaning_ko: '학업의', pos: 'adjective' },
                ],
            }),
        }));

        render(<App />);

        const input = await screen.findByPlaceholderText('Enter an English word (e.g., Epiphany)');

        fireEvent.change(input, { target: { value: 'aca' } });

        const listbox = await screen.findByRole('listbox', { name: '단어 자동완성 제안' });
        expect(listbox.dataset.portalRoot).toBe('document-body');
        expect(listbox.parentElement).toBe(document.body);
    });
});
