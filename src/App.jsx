import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';

// Components
import Header from './components/Header';
import LoginScreen from './components/LoginScreen';
import QuizView from './components/QuizView';
import AccountSettings from './components/AccountSettings';
import VocabularyDashboard from './components/VocabularyDashboard';
import { Loader2, Check, RotateCw } from './components/Icons';

// Hooks & Services
import useWindowSize from './hooks/useWindowSize';
import { generateWordData } from './services/geminiService';
import { AI_PROVIDERS, DEFAULT_AI_SETTINGS, getActiveAiConfig } from './services/aiModelService';
import {
    getCurrentUser as getCurrentUserApi,
    login as loginApi,
    logout as logoutApi,
    signup as signupApi,
} from './services/authApi';
import { createWord, deleteWord, listWords, updateWord } from './services/wordApi';
import { createFolder, deleteFolder, listFolders, reorderFolders, updateFolder } from './services/folderApi';
import { getSettings } from './services/settingsApi';
import { getDictionaryAutocompleteSuggestions } from './services/dictionaryAutocompleteService';
import {
    buildVocabularyPayload,
    getVocabularyWordKey,
    normalizeCapturedWord,
} from './utils/vocabularyCapture';
import {
    normalizeAiSettings,
    normalizeFolder,
    normalizeSessionUser,
    normalizeWord,
    sortFoldersForDisplay,
    sortWordsByNewest,
} from './utils/appDataTransforms';

// --- System Constants ---
const loadConfig = (envKey, localKey) => {
    if (import.meta.env[envKey]) return import.meta.env[envKey];
    if (typeof window !== 'undefined' && window[localKey]) return window[localKey];
    return localStorage.getItem(localKey);
};

const DEFAULT_GEMINI_API_KEY = loadConfig('VITE_GEMINI_API_KEY', '__api_key') || '';
const DEFAULT_OPENAI_API_KEY = loadConfig('VITE_OPENAI_API_KEY', '__openai_api_key') || '';
const DEFAULT_CLAUDE_API_KEY = loadConfig('VITE_CLAUDE_API_KEY', '__claude_api_key') || '';
const DEFAULT_AI_SETTINGS_LOADED = {
    ...DEFAULT_AI_SETTINGS,
    geminiApiKey: DEFAULT_GEMINI_API_KEY,
    openaiApiKey: DEFAULT_OPENAI_API_KEY,
    claudeApiKey: DEFAULT_CLAUDE_API_KEY,
};

const MAX_WORD_SUGGESTIONS = 5;
const MIN_WORD_SUGGESTION_LENGTH = 2;

// --- URL ↔ View 매핑 ---
const PATH_TO_VIEW = { '/study': 'study', '/dashboard': 'dashboard' };
const VIEW_TO_PATH = { study: '/study', dashboard: '/' };

const getViewFromPath = () =>
    PATH_TO_VIEW[window.location.pathname] ?? 'dashboard';

// --- Main App Component ---
function App() {
    const [user, setUser] = useState(null);
    const [view, setView] = useState(getViewFromPath);

    // URL ↔ state 동기화: pushState + popstate
    const navigate = React.useCallback((nextView) => {
        const path = VIEW_TO_PATH[nextView] ?? '/';
        window.history.pushState({ view: nextView }, '', path);
        setView(nextView);
    }, []);

    useEffect(() => {
        const onPopState = () => setView(getViewFromPath());
        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
    }, []);
    const [words, setWords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loginLoading, setLoginLoading] = useState(false);
    const [inputWord, setInputWord] = useState('');
    const [isWordSuggestOpen, setIsWordSuggestOpen] = useState(false);
    const [wordAutocompleteSuggestions, setWordAutocompleteSuggestions] = useState([]);
    const [wordSuggestionPanelStyle, setWordSuggestionPanelStyle] = useState({});
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [notification, setNotification] = useState(null);
    const [aiMode, setAiMode] = useState(false);

    const [folders, setFolders] = useState([]);
    const [selectedFolderId, setSelectedFolderId] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [sortMode, setSortMode] = useState('newest');
    const [accountAiSettings, setAccountAiSettings] = useState(DEFAULT_AI_SETTINGS_LOADED);

    const windowSize = useWindowSize();
    const wordInputRef = useRef(null);
    const notificationTimerRef = useRef(null);
    const activeAiConfig = useMemo(() => getActiveAiConfig(accountAiSettings), [accountAiSettings]);
    const activeAiProvider = AI_PROVIDERS[activeAiConfig.provider] || AI_PROVIDERS.gemini;
    const shouldShowWordSuggestions = isWordSuggestOpen && !isAnalyzing && wordAutocompleteSuggestions.length > 0;
    const updateWordSuggestionPanel = useCallback(() => {
        if (!wordInputRef.current || typeof window === 'undefined') return;
        const rect = wordInputRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth || rect.right || 320;
        const width = Math.min(Math.max(rect.width || wordInputRef.current.offsetWidth || 260, 260), Math.max(viewportWidth - 32, 260));
        const left = Math.max(16, Math.min(rect.left || 16, viewportWidth - width - 16));
        setWordSuggestionPanelStyle({
            top: `${Math.max(rect.bottom + 8, 8)}px`,
            left: `${left}px`,
            width: `${width}px`,
        });
    }, []);

    useEffect(() => {
        let isCurrent = true;

        if (!isWordSuggestOpen || isAnalyzing || inputWord.trim().length < MIN_WORD_SUGGESTION_LENGTH) {
            setWordAutocompleteSuggestions([]);
            return () => {
                isCurrent = false;
            };
        }

        getDictionaryAutocompleteSuggestions(inputWord, { limit: MAX_WORD_SUGGESTIONS })
            .then((suggestions) => {
                if (isCurrent) setWordAutocompleteSuggestions(suggestions);
            })
            .catch((error) => {
                console.warn('Dictionary autocomplete failed:', error);
                if (isCurrent) setWordAutocompleteSuggestions([]);
            });

        return () => {
            isCurrent = false;
        };
    }, [inputWord, isAnalyzing, isWordSuggestOpen]);

    useEffect(() => {
        if (!shouldShowWordSuggestions) return undefined;
        updateWordSuggestionPanel();
        window.addEventListener('resize', updateWordSuggestionPanel);
        window.addEventListener('scroll', updateWordSuggestionPanel, true);
        return () => {
            window.removeEventListener('resize', updateWordSuggestionPanel);
            window.removeEventListener('scroll', updateWordSuggestionPanel, true);
        };
    }, [shouldShowWordSuggestions, updateWordSuggestionPanel, inputWord]);
    // 카드 단일 컬럼은 sm 미만(좁은 폰)에서만. 그 이상은 항상 2-컬럼 카드.
    const isMobile = windowSize.width < 640;
    // 사이드바는 lg 이상에서만 표시. 그 미만에서는 모바일 picker로 폴더 선택.
    const showSidebar = windowSize.width >= 1024;

    const clearSessionState = () => {
        setUser(null);
        setWords([]);
        setFolders([]);
        setSelectedFolderId(null);
        setAddToFolderId(null);
        setShowSettings(false);
        setAccountAiSettings(DEFAULT_AI_SETTINGS_LOADED);
    };

    const handleUserUpdate = (partial) => {
        if (!partial) return;
        setUser((prev) => (prev ? { ...prev, ...partial } : prev));
    };

    const handleDataReset = () => {
        setWords([]);
        setFolders([]);
        setSelectedFolderId(null);
        setAddToFolderId(null);
    };

    const handleAccountDeleted = () => clearSessionState();

    const loadSessionData = async () => {
        const [settings, fetchedWords, fetchedFolders] = await Promise.all([
            getSettings(),
            listWords(),
            listFolders(),
        ]);

        setAccountAiSettings(normalizeAiSettings(settings, AI_PROVIDERS, DEFAULT_AI_SETTINGS_LOADED));
        setWords(sortWordsByNewest(fetchedWords.map(normalizeWord)));

        const nextFolders = sortFoldersForDisplay(fetchedFolders.map(normalizeFolder));
        setFolders(nextFolders);
        setSelectedFolderId((currentFolderId) =>
            nextFolders.some((folder) => folder.id === currentFolderId) ? currentFolderId : null
        );
    };

    const hydrateAuthenticatedSession = async (rawUser) => {
        const sessionUser = normalizeSessionUser(rawUser);
        if (!sessionUser) throw new Error('Invalid authenticated session');
        await loadSessionData();
        setUser(sessionUser);
        return sessionUser;
    };

    useEffect(() => {
        let isMounted = true;

        const bootstrapSession = async () => {
            setLoading(true);
            try {
                const response = await getCurrentUserApi();
                if (!isMounted) return;
                const sessionUser = normalizeSessionUser(response?.user);
                if (!sessionUser) {
                    clearSessionState();
                    return;
                }
                await hydrateAuthenticatedSession(sessionUser);
            } catch (error) {
                if (!isMounted) return;
                if (error?.status !== 401) {
                    console.error('Session bootstrap error:', error);
                    showNotification('초기 데이터 로딩 실패: ' + (error.message || 'Unknown error'), 'error');
                }
                clearSessionState();
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        bootstrapSession();
        return () => { isMounted = false; };
    }, []);

    useEffect(() => () => {
        if (notificationTimerRef.current) {
            clearTimeout(notificationTimerRef.current);
        }
    }, []);

    const showNotification = (msg, type = 'success') => {
        setNotification({ msg, type });
        if (notificationTimerRef.current) {
            clearTimeout(notificationTimerRef.current);
        }
        notificationTimerRef.current = setTimeout(() => {
            setNotification(null);
            notificationTimerRef.current = null;
        }, 3000);
    };

    const handleEmailLogin = async (email, password) => {
        setLoginLoading(true);
        try {
            const response = await loginApi({ email, password });
            await hydrateAuthenticatedSession(response?.user);
            showNotification('로그인 성공! 환영합니다.');
        } catch (error) {
            console.error('Email Login Error:', error);
            clearSessionState();
            showNotification(error.message || '로그인 실패', 'error');
        } finally {
            setLoginLoading(false);
        }
    };

    const handleEmailSignup = async (email, password) => {
        setLoginLoading(true);
        try {
            const response = await signupApi({ email, password });
            await hydrateAuthenticatedSession(response?.user);
            showNotification('🎉 회원가입이 완료되었습니다! 환영합니다.');
        } catch (error) {
            console.error('Email Signup Error:', error);
            clearSessionState();
            showNotification(error.message || '회원가입 실패', 'error');
        } finally {
            setLoginLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await logoutApi();
            clearSessionState();
            showNotification('로그아웃되었습니다.');
        } catch (error) {
            console.error('Logout Error:', error);
            showNotification('로그아웃 실패: ' + error.message, 'error');
        }
    };

    const [addToFolderId, setAddToFolderId] = useState(null);

    useEffect(() => { setAddToFolderId(selectedFolderId); }, [selectedFolderId]);

    const upsertWordInState = (word) => {
        const normalizedWord = normalizeWord(word);
        setWords((prev) => sortWordsByNewest([...prev.filter((it) => it.id !== normalizedWord.id), normalizedWord]));
        return normalizedWord;
    };

    const upsertFolderInState = (folder) => {
        const normalizedFolder = normalizeFolder(folder);
        setFolders((prev) => sortFoldersForDisplay([...prev.filter((it) => it.id !== normalizedFolder.id), normalizedFolder]));
        return normalizedFolder;
    };

    const removeWordFromState = (wordId) =>
        setWords((prev) => prev.filter((it) => it.id !== wordId));

    const removeFolderFromState = (folderId) => {
        setFolders((prev) => prev.filter((it) => it.id !== folderId));
        setWords((prev) => prev.map((it) => (it.folderId === folderId ? { ...it, folderId: null } : it)));
        setSelectedFolderId((current) => (current === folderId ? null : current));
        setAddToFolderId((current) => (current === folderId ? null : current));
    };

    const handleAddWord = async (e) => {
        e.preventDefault();
        if (!inputWord.trim() || !user) return;
        setIsWordSuggestOpen(false);
        if (!activeAiConfig.apiKey) {
            showNotification(`${activeAiProvider.name} API Key가 필요합니다. 계정 설정에서 키를 등록해 주세요.`, 'error');
            return;
        }

        setIsAnalyzing(true);
        try {
            const analysisResult = await generateWordData(inputWord, activeAiConfig);
            const folderId = addToFolderId === null || addToFolderId === undefined || addToFolderId === ''
                ? null
                : Number(addToFolderId);
            const createdWord = await createWord({
                ...analysisResult,
                folder_id: Number.isNaN(folderId) ? null : folderId,
            });
            upsertWordInState(createdWord);

            setInputWord('');
            const folderName = Number.isNaN(folderId) || folderId === null
                ? null
                : folders.find(f => f.id === folderId)?.name;
            showNotification(`'${analysisResult.word}' ${folderName ? `→ ${folderName}` : ''} 추가 완료!`);
        } catch (error) {
            console.error('Add Word Error:', error);
            showNotification(error.message.includes('403') ? 'API Key Invalid or Expired' : 'Analysis failed: ' + error.message, 'error');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSaveVocabularyWord = async (rawWord, context = {}) => {
        if (!user) throw new Error('로그인이 필요합니다.');
        const capturedWord = normalizeCapturedWord(rawWord);
        if (!capturedWord) throw new Error('저장할 단어를 찾을 수 없습니다.');

        const existingWord = words.find((word) => getVocabularyWordKey(word.word) === capturedWord);
        if (existingWord) {
            showNotification(`'${existingWord.word}'는 이미 단어장에 있습니다.`);
            return existingWord;
        }

        if (!activeAiConfig.apiKey) {
            throw new Error(`${activeAiProvider.name} API Key가 필요합니다. 계정 설정에서 키를 등록해 주세요.`);
        }

        const analysisResult = await generateWordData(capturedWord, activeAiConfig);
        const createdWord = await createWord(buildVocabularyPayload(analysisResult, capturedWord, context));
        const normalizedWord = upsertWordInState(createdWord);
        showNotification(`'${normalizedWord.word}' 단어장에 저장했습니다.`);
        return normalizedWord;
    };

    const handleExplainVocabularyWord = async (rawWord) => {
        if (!user) throw new Error('로그인이 필요합니다.');
        const capturedWord = normalizeCapturedWord(rawWord);
        if (!capturedWord) throw new Error('설명할 단어를 찾을 수 없습니다.');
        if (!activeAiConfig.apiKey) {
            throw new Error(`${activeAiProvider.name} API Key가 필요합니다. 계정 설정에서 키를 등록해 주세요.`);
        }

        const existingWord = words.find((word) => getVocabularyWordKey(word.word) === capturedWord);
        if (existingWord) return existingWord;
        return generateWordData(capturedWord, activeAiConfig);
    };

    const handleDeleteWord = async (wordId) => {
        if (!window.confirm('Delete this word?') || !user) return;
        try {
            await deleteWord(wordId);
            removeWordFromState(wordId);
            showNotification('Word deleted.');
        } catch (e) {
            console.error('Delete failed', e);
            showNotification('Failed to delete word: ' + e.message, 'error');
        }
    };

    const handleCreateFolder = async (name, color, icon) => {
        if (!user) return;
        try {
            const createdFolder = await createFolder({ name, color, icon: icon || null });
            upsertFolderInState(createdFolder);
            showNotification(`'${name}' 폴더가 생성되었습니다.`);
        } catch (e) {
            showNotification('폴더 생성 실패: ' + e.message, 'error');
        }
    };

    const handleUpdateFolder = async (folderId, newName, newColor, newIcon) => {
        if (!user) return;
        try {
            const updateData = {};
            if (newName) updateData.name = newName;
            if (newColor) updateData.color = newColor;
            if (newIcon !== undefined) updateData.icon = newIcon;
            if (Object.keys(updateData).length === 0) return;

            const updatedFolder = await updateFolder(folderId, updateData);
            upsertFolderInState(updatedFolder);
            showNotification('폴더 정보가 업데이트되었습니다.');
        } catch (e) {
            showNotification('업데이트 실패: ' + e.message, 'error');
        }
    };

    const handleReorderFolders = async (newFolders) => {
        if (!user) return;
        try {
            const reorderedFolders = await reorderFolders(newFolders.map((folder) => folder.id));
            setFolders(sortFoldersForDisplay(reorderedFolders.map(normalizeFolder)));
        } catch (e) {
            console.error('Reorder failed:', e);
            showNotification('순서 변경 실패', 'error');
        }
    };

    const handleRenameFolder = async (folderId, newName) => {
        await handleUpdateFolder(folderId, newName);
    };

    const handleDeleteFolder = async (folderId) => {
        if (!user) return;
        try {
            await deleteFolder(folderId);
            removeFolderFromState(folderId);
            showNotification('폴더가 삭제되었습니다.');
        } catch (e) {
            showNotification('폴더 삭제 실패: ' + e.message, 'error');
        }
    };

    const handleMoveWord = async (wordId, targetFolderId) => {
        if (!user) return;
        try {
            const updatedWord = await updateWord(wordId, { folder_id: targetFolderId || null });
            upsertWordInState(updatedWord);
        } catch (e) {
            showNotification('단어 이동 실패: ' + e.message, 'error');
        }
    };

    const handleRegenerateWord = async (wordId) => {
        if (!user) return;
        if (!activeAiConfig.apiKey) {
            showNotification(`${activeAiProvider.name} API Key가 필요합니다. 계정 설정에서 키를 등록해 주세요.`, 'error');
            return;
        }

        const existingWord = words.find(w => w.id === wordId);
        if (!existingWord) {
            showNotification('단어를 찾을 수 없습니다.', 'error');
            return;
        }

        try {
            const newWordData = await generateWordData(existingWord.word, activeAiConfig);
            const updatedWord = await updateWord(wordId, {
                meaning_ko: newWordData.meaning_ko,
                pronunciation: newWordData.pronunciation,
                pos: newWordData.pos,
                definitions: newWordData.definitions,
                definitions_ko: newWordData.definitions_ko,
                examples: newWordData.examples,
                synonyms: newWordData.synonyms,
                nuance: newWordData.nuance,
            });
            upsertWordInState(updatedWord);
        } catch (error) {
            console.error('Regenerate Word Error:', error);
            showNotification(
                error.message.includes('403') ? 'API Key Invalid or Expired' : '재생성 실패: ' + error.message,
                'error',
            );
        }
    };

    const handleUpdateLearningRate = async (wordId, newRate, statsUpdate = {}) => {
        if (!user) return;
        try {
            const currentWord = words.find((word) => word.id === wordId);
            const updatedWord = await updateWord(wordId, {
                learning_rate: Math.max(0, Math.min(100, Math.round(newRate))),
                stats: {
                    wrong_count: statsUpdate.wrong_count ?? currentWord?.stats?.wrong_count ?? 0,
                    review_count: statsUpdate.review_count ?? currentWord?.stats?.review_count ?? 0,
                },
            });
            upsertWordInState(updatedWord);
        } catch (e) {
            console.error('Learning rate update failed:', e);
        }
    };

    const NotificationToast = () => notification ? (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-md shadow-[var(--shadow-elevated)] z-50 text-white font-bold flex items-center gap-2 animate-bounce ${
            notification.type === 'error' ? 'bg-danger-500' : 'bg-success-600'
        }`}>
            {notification.type === 'error' ? (
                <RotateCw className="w-4 h-4" aria-hidden="true" />
            ) : (
                <Check className="w-4 h-4" aria-hidden="true" />
            )}
            {notification.msg}
        </div>
    ) : null;

    const wordSuggestionPortal = shouldShowWordSuggestions && typeof document !== 'undefined'
        ? createPortal(
            <div
                id="word-autocomplete-suggestions"
                role="listbox"
                aria-label="단어 자동완성 제안"
                style={wordSuggestionPanelStyle}
                className="fixed z-[1000] max-h-72 overflow-y-auto rounded-md border border-surface-200 bg-white shadow-[var(--shadow-elevated)]"
            >
                {wordAutocompleteSuggestions.map((suggestion) => (
                    <button
                        key={suggestion.word}
                        type="button"
                        role="option"
                        aria-label={`${suggestion.word} 자동완성 선택`}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                            setInputWord(suggestion.word);
                            setIsWordSuggestOpen(false);
                        }}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-brand-50 focus:bg-brand-50 focus:outline-none"
                    >
                        <span className="min-w-0">
                            <span className="block truncate text-sm font-black text-surface-900">
                                {suggestion.word}
                            </span>
                            <span className="block truncate text-xs font-semibold text-surface-500">
                                {suggestion.meaning_ko}
                            </span>
                        </span>
                        {suggestion.pos && (
                            <span className="shrink-0 rounded-sm bg-surface-100 px-2 py-1 text-[11px] font-black text-surface-500">
                                {suggestion.pos}
                            </span>
                        )}
                    </button>
                ))}
                <div className="border-t border-surface-100 px-3 py-1.5 text-[11px] font-semibold text-surface-400">
                    사전 데이터: krdict-reader
                </div>
            </div>,
            document.body
        )
        : null;

    if (loading) {
        return (
            <>
                <div className="min-h-screen flex items-center justify-center bg-surface-50">
                    <div className="text-center">
                        <Loader2 className="w-10 h-10 text-brand-600 animate-spin mx-auto mb-4" aria-hidden="true" />
                        <p className="text-surface-500 font-bold">Initializing VocaLoop...</p>
                    </div>
                </div>
                <NotificationToast />
            </>
        );
    }

    if (!user) {
        return (
            <>
                <LoginScreen
                    onEmailLogin={handleEmailLogin}
                    onEmailSignup={handleEmailSignup}
                    isLoading={loginLoading}
                />
                <NotificationToast />
            </>
        );
    }

    return (
        <div className="min-h-screen pb-20">
            <Header view={view} setView={navigate} user={user} onOpenSettings={() => setShowSettings(true)} />
            <NotificationToast />
            {wordSuggestionPortal}

            {showSettings && (
                <AccountSettings
                    user={user}
                    words={words}
                    folders={folders}
                    onClose={() => setShowSettings(false)}
                    onLogout={handleLogout}
                    showNotification={showNotification}
                    aiSettings={accountAiSettings}
                    onAiSettingsChange={setAccountAiSettings}
                    onCreateFolder={handleCreateFolder}
                    onRenameFolder={handleRenameFolder}
                    onDeleteFolder={handleDeleteFolder}
                    onUserUpdate={handleUserUpdate}
                    onDataReset={handleDataReset}
                    onAccountDeleted={handleAccountDeleted}
                />
            )}

            <main className="max-w-6xl mx-auto px-4 pt-8">
                {view === 'dashboard' && (
                    <VocabularyDashboard
                        words={words}
                        folders={folders}
                        selectedFolderId={selectedFolderId}
                        onSelectFolder={setSelectedFolderId}
                        showSidebar={showSidebar}
                        isMobile={isMobile}
                        inputWord={inputWord}
                        setInputWord={setInputWord}
                        setIsWordSuggestOpen={setIsWordSuggestOpen}
                        wordInputRef={wordInputRef}
                        shouldShowWordSuggestions={shouldShowWordSuggestions}
                        isAnalyzing={isAnalyzing}
                        onAddWord={handleAddWord}
                        addToFolderId={addToFolderId}
                        setAddToFolderId={setAddToFolderId}
                        sortMode={sortMode}
                        setSortMode={setSortMode}
                        onCreateFolder={handleCreateFolder}
                        onUpdateFolder={handleUpdateFolder}
                        onDeleteFolder={handleDeleteFolder}
                        onReorderFolders={handleReorderFolders}
                        onDeleteWord={handleDeleteWord}
                        onMoveWord={handleMoveWord}
                        onRegenerateWord={handleRegenerateWord}
                    />
                )}
                {view === 'study' && (
                    <QuizView
                        words={words}
                        setView={navigate}
                        user={user}
                        aiMode={aiMode}
                        setAiMode={setAiMode}
                        aiConfig={activeAiConfig}
                        folders={folders}
                        onUpdateLearningRate={handleUpdateLearningRate}
                        onSaveVocabularyWord={handleSaveVocabularyWord}
                        onExplainVocabularyWord={handleExplainVocabularyWord}
                    />
                )}
            </main>
        </div>
    );
}

export default App;
