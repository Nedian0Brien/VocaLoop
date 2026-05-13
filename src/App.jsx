import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';

// Components
import Header from './components/Header';
import LoginScreen from './components/LoginScreen';
import WordCard from './components/WordCard';
import EmptyState from './components/EmptyState';
import QuizView from './components/QuizView';
import FolderSidebar from './components/FolderSidebar';
import CompactFolderPicker from './components/CompactFolderPicker';
import AccountSettings from './components/AccountSettings';
import { Loader2, Plus, Search, Check, RotateCw, Sparkles, Folder } from './components/Icons';

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
    getLearningStatus,
    LEARNING_STATUS,
    LEARNING_STATUS_CONFIG,
    groupWordsByStatus,
    sortByLearningRate,
} from './utils/learningRate';

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

const getCreatedAtValue = (value) => {
    if (!value) return 0;
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'string' || typeof value === 'number') {
        const timestamp = new Date(value).getTime();
        return Number.isNaN(timestamp) ? 0 : timestamp;
    }
    if (typeof value === 'object' && typeof value.seconds === 'number') {
        return value.seconds * 1000;
    }
    return 0;
};

const normalizeSessionUser = (value) => {
    if (!value) return null;
    return {
        ...value,
        displayName: value.displayName ?? value.display_name ?? null,
        photoURL: value.photoURL ?? value.photo_url ?? null,
    };
};

const normalizeFolder = (folder) => ({
    ...folder,
    createdAt: folder.createdAt ?? folder.created_at ?? null,
    updatedAt: folder.updatedAt ?? folder.updated_at ?? null,
});

const normalizeWord = (word) => ({
    ...word,
    folderId: word.folderId ?? word.folder_id ?? null,
    learningRate: word.learningRate ?? word.learning_rate ?? 0,
    createdAt: word.createdAt ?? word.created_at ?? null,
    updatedAt: word.updatedAt ?? word.updated_at ?? null,
});

const sortWordsByNewest = (items) =>
    [...items].sort((a, b) => getCreatedAtValue(b.createdAt) - getCreatedAtValue(a.createdAt));

const MAX_WORD_SUGGESTIONS = 5;
const MIN_WORD_SUGGESTION_LENGTH = 2;

const sortFoldersForDisplay = (items) =>
    [...items].sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined && a.order !== b.order) {
            return a.order - b.order;
        }
        return getCreatedAtValue(a.createdAt) - getCreatedAtValue(b.createdAt);
    });

const normalizeAiSettings = (settings = {}) => {
    const provider = AI_PROVIDERS[settings.provider] ? settings.provider : DEFAULT_AI_SETTINGS_LOADED.provider;
    const providerConfig = AI_PROVIDERS[provider] || AI_PROVIDERS.gemini;

    return {
        provider,
        model: providerConfig.models.includes(settings.model) ? settings.model : providerConfig.models[0],
        geminiApiKey: settings.geminiApiKey ?? DEFAULT_AI_SETTINGS_LOADED.geminiApiKey ?? '',
        openaiApiKey: settings.openaiApiKey ?? DEFAULT_AI_SETTINGS_LOADED.openaiApiKey ?? '',
        claudeApiKey: settings.claudeApiKey ?? DEFAULT_AI_SETTINGS_LOADED.claudeApiKey ?? '',
    };
};

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

        setAccountAiSettings(normalizeAiSettings(settings));
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

    const showNotification = (msg, type = 'success') => {
        setNotification({ msg, type });
        setTimeout(() => setNotification(null), 3000);
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

    // --- Computed values ---
    const wordCountByFolder = {};
    words.forEach(w => {
        const fId = w.folderId || '__uncategorized';
        wordCountByFolder[fId] = (wordCountByFolder[fId] || 0) + 1;
    });

    const filteredWordsBase = selectedFolderId
        ? words.filter(w => w.folderId === selectedFolderId)
        : words;

    const filteredWords = (() => {
        switch (sortMode) {
            case 'learning-rate-asc':
                return sortByLearningRate(filteredWordsBase, 'asc');
            case 'learning-rate-desc':
                return sortByLearningRate(filteredWordsBase, 'desc');
            case 'status-group':
                return sortByLearningRate(filteredWordsBase, 'asc');
            default:
                return [...filteredWordsBase].sort((a, b) => {
                    return getCreatedAtValue(b.createdAt) - getCreatedAtValue(a.createdAt);
                });
        }
    })();

    const wordStatusGroups = sortMode === 'status-group'
        ? groupWordsByStatus(filteredWords)
        : null;

    const renderWordCards = (wordList, includeLoading = false) => {
        const loadingCard = (
            <div className="w-full h-64 relative animate-in fade-in zoom-in duration-300">
                <div className="w-full h-full rounded-xl bg-white shadow-[var(--shadow-soft)] border border-brand-200 overflow-hidden relative">
                    <div className="p-6 flex flex-col items-center justify-center text-center h-full opacity-40 blur-[2px]">
                        <span className="text-xs font-black text-brand-300 uppercase tracking-wider mb-2">Generating</span>
                        <h3 className="text-3xl font-bold text-surface-400 font-serif mb-2">{inputWord || 'New Word'}</h3>
                        <div className="w-8 h-8 rounded-pill border-4 border-surface-100 mt-4"></div>
                    </div>
                    <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center">
                        <Loader2 className="w-10 h-10 text-brand-600 animate-spin mb-3" aria-hidden="true" />
                        <p className="text-lg font-black text-brand-700 tracking-tight">단어 생성 중...</p>
                        <p className="text-sm font-semibold text-surface-600 mt-1">AI가 분석하고 있습니다</p>
                    </div>
                </div>
            </div>
        );

        const renderItem = (word, index) => (
            <div key={word.id} className="animate-slide-in" style={{ animationDelay: `${index * 0.05}s` }}>
                <WordCard
                    item={word}
                    handleDeleteWord={handleDeleteWord}
                    folders={folders}
                    onMoveWord={handleMoveWord}
                    onRegenerateWord={handleRegenerateWord}
                />
            </div>
        );

        if (isMobile) {
            // 단일 컬럼 — sm 미만 (좁은 폰)에서만. 폭 캡 불필요.
            return (
                <div className="flex flex-col gap-4">
                    {includeLoading && loadingCard}
                    {wordList.map((word, index) => renderItem(word, index))}
                </div>
            );
        }

        const leftColumn = [];
        const rightColumn = [];

        if (includeLoading) {
            leftColumn.push(loadingCard);
            wordList.forEach((word, index) => {
                if (index % 2 === 0) rightColumn.push(renderItem(word, index));
                else leftColumn.push(renderItem(word, index));
            });
        } else {
            wordList.forEach((word, index) => {
                if (index % 2 === 0) leftColumn.push(renderItem(word, index));
                else rightColumn.push(renderItem(word, index));
            });
        }

        return (
            <div className="grid grid-cols-2 gap-4 items-start">
                <div className="flex flex-col gap-4">{leftColumn}</div>
                <div className="flex flex-col gap-4">{rightColumn}</div>
            </div>
        );
    };

    const renderMasonryLayout = () => {
        if (filteredWords.length === 0 && !isAnalyzing) {
            if (selectedFolderId && words.length > 0) {
                return (
                    <div className="text-center py-12 px-4">
                        <div className="w-16 h-16 bg-surface-50 text-surface-400 rounded-pill flex items-center justify-center mx-auto mb-4">
                            <Folder className="w-8 h-8" aria-hidden="true" />
                        </div>
                        <h3 className="text-lg font-black text-surface-900 mb-1 tracking-tight">이 폴더는 비어있습니다</h3>
                        <p className="text-surface-500 font-semibold">단어 카드의 폴더 버튼으로 단어를 이동할 수 있습니다.</p>
                    </div>
                );
            }
            return <EmptyState />;
        }

        if (wordStatusGroups) {
            const statusOrder = [LEARNING_STATUS.DIFFICULT, LEARNING_STATUS.LEARNING, LEARNING_STATUS.MEMORIZED];
            return (
                <div className="space-y-8">
                    {isAnalyzing && (
                        <div className="mb-8">
                            <div className="flex items-center gap-2 mb-3 px-1">
                                <span className="w-2.5 h-2.5 rounded-pill bg-brand-500 animate-pulse" aria-hidden="true" />
                                <h3 className="text-sm font-black uppercase tracking-wider text-brand-600">
                                    Creating New Word
                                </h3>
                            </div>
                            {renderWordCards([], true)}
                        </div>
                    )}
                    {statusOrder.map(status => {
                        const groupWords = wordStatusGroups[status];
                        if (groupWords.length === 0) return null;
                        const config = LEARNING_STATUS_CONFIG[status];
                        return (
                            <div key={status}>
                                <div className="flex items-center gap-2 mb-3 px-1">
                                    <span className={`w-2.5 h-2.5 rounded-pill ${config.dotColor}`} aria-hidden="true" />
                                    <h3 className={`text-sm font-black uppercase tracking-wider ${config.textColor}`}>
                                        {config.label}
                                    </h3>
                                    <span className="text-xs text-surface-400 font-bold">
                                        {groupWords.length}개
                                    </span>
                                </div>
                                {renderWordCards(groupWords, false)}
                            </div>
                        );
                    })}
                </div>
            );
        }

        return renderWordCards(filteredWords, isAnalyzing);
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
                <div className="flex flex-col lg:flex-row gap-8 items-start">
                    {/* Sidebar */}
                    {view === 'dashboard' && showSidebar && (
                        <aside className="hidden lg:block w-64 flex-shrink-0 sticky top-8">
                            <FolderSidebar
                                folders={folders}
                                selectedFolderId={selectedFolderId}
                                onSelectFolder={setSelectedFolderId}
                                onCreateFolder={handleCreateFolder}
                                onUpdateFolder={handleUpdateFolder}
                                onDeleteFolder={handleDeleteFolder}
                                wordCountByFolder={wordCountByFolder}
                                totalWordCount={words.length}
                            />
                        </aside>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0 w-full">
                        {/* Add Word — dashboard 전용 */}
                        {view === 'dashboard' && <div className="bg-white rounded-card shadow-[var(--shadow-soft)] border border-surface-200 p-6 mb-8 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-500 via-accent-500 to-brand-500 opacity-20"></div>
                            <h2 className="text-lg font-black text-surface-900 mb-4 flex items-center gap-2 tracking-tight">
                                <Plus className="w-5 h-5 text-brand-600" aria-hidden="true" />
                                Add New Word
                            </h2>
                            <form onSubmit={handleAddWord} className="relative">
                                <div className="flex gap-3">
                                    <div
                                        className="relative flex-1 group"
                                        onBlur={(event) => {
                                            if (!event.currentTarget.contains(event.relatedTarget)) {
                                                setIsWordSuggestOpen(false);
                                            }
                                        }}
                                    >
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors">
                                            <Search className="h-5 w-5 text-surface-400" aria-hidden="true" />
                                        </div>
                                        <input
                                            ref={wordInputRef}
                                            type="text"
                                            value={inputWord}
                                            onChange={(e) => {
                                                setInputWord(e.target.value);
                                                setIsWordSuggestOpen(true);
                                            }}
                                            onFocus={() => setIsWordSuggestOpen(true)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Escape') setIsWordSuggestOpen(false);
                                            }}
                                            placeholder="Enter an English word (e.g., Epiphany)"
                                            aria-label="새 영어 단어 입력"
                                            aria-autocomplete="list"
                                            aria-controls="word-autocomplete-suggestions"
                                            aria-expanded={shouldShowWordSuggestions}
                                            className="block w-full pl-10 pr-3 py-3 border border-surface-300 rounded-md leading-5 bg-surface-50 placeholder-surface-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all"
                                            disabled={isAnalyzing}
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isAnalyzing || !inputWord.trim()}
                                        style={{ backgroundPosition: isAnalyzing ? 'right center' : 'left center' }}
                                        className={[
                                            'relative overflow-hidden px-6 py-3 rounded-md font-black text-white shadow-[var(--shadow-card)] transition-all duration-300',
                                            isAnalyzing ? 'cursor-wait pl-10' : 'hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5',
                                            'bg-gradient-to-r from-brand-600 via-indigo-pair-600 to-accent-600 bg-[length:200%_auto]',
                                            'disabled:opacity-70 disabled:cursor-not-allowed group',
                                        ].join(' ')}
                                    >
                                        <div className="flex items-center gap-2 relative z-10">
                                            {isAnalyzing ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                                                    <span>Crafting...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span>Generate</span>
                                                    <Sparkles className="w-4 h-4 opacity-80 group-hover:scale-110 transition-transform" aria-hidden="true" />
                                                </>
                                            )}
                                        </div>
                                        {!isAnalyzing && <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:animate-[shimmer_1.5s_infinite] skew-x-12"></div>}
                                    </button>
                                </div>
                                <div className="flex items-center justify-between mt-2 ml-1">
                                    <p className="text-xs text-surface-500 flex items-center gap-1 font-semibold">
                                        <span className="text-brand-600 font-black">AI Powered:</span> Definitions, examples, and nuances will be generated automatically.
                                    </p>
                                    {folders.length > 0 && (
                                        <div className="flex items-center gap-1.5">
                                            <Folder className="w-3.5 h-3.5 text-surface-400" aria-hidden="true" />
                                            <select
                                                value={addToFolderId || ''}
                                                onChange={(e) => setAddToFolderId(e.target.value ? Number(e.target.value) : null)}
                                                aria-label="추가할 폴더 선택"
                                                className="text-xs border-surface-300 rounded-sm py-0.5 px-1.5 text-surface-600 focus:border-brand-300 focus:ring focus:ring-brand-200 focus:ring-opacity-50"
                                            >
                                                <option value="">미분류</option>
                                                {folders.map(f => (
                                                    <option key={f.id} value={f.id}>{f.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </form>
                        </div>}

                        {view === 'dashboard' && (
                            <div className="space-y-6">
                                {!showSidebar && (
                                    <CompactFolderPicker
                                        folders={folders}
                                        selectedFolderId={selectedFolderId}
                                        onSelectFolder={setSelectedFolderId}
                                        onCreateFolder={handleCreateFolder}
                                        onUpdateFolder={handleUpdateFolder}
                                        onDeleteFolder={handleDeleteFolder}
                                        onReorderFolders={handleReorderFolders}
                                        wordCountByFolder={wordCountByFolder}
                                        totalWordCount={words.length}
                                    />
                                )}
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <h2 className="text-xl font-black text-surface-900 tracking-tight">
                                        {selectedFolderId
                                            ? `${folders.find(f => f.id === selectedFolderId)?.name || '폴더'} (${filteredWords.length})`
                                            : `My Vocabulary (${words.length})`
                                        }
                                    </h2>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                const next = sortMode === 'status-group' ? 'newest' : 'status-group';
                                                setSortMode(next);
                                            }}
                                            title="학습 상태별 그룹 보기"
                                            aria-pressed={sortMode === 'status-group'}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-black rounded-sm border transition-all ${
                                                sortMode === 'status-group'
                                                    ? 'bg-brand-50 border-brand-200 text-brand-700'
                                                    : 'bg-white border-surface-200 text-surface-600 hover:border-surface-300'
                                            }`}
                                        >
                                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                                                <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                                            </svg>
                                            그룹
                                        </button>
                                        <select
                                            value={sortMode}
                                            onChange={(e) => setSortMode(e.target.value)}
                                            aria-label="정렬 방식"
                                            className="text-sm border-surface-300 rounded-sm shadow-sm focus:border-brand-300 focus:ring focus:ring-brand-200 focus:ring-opacity-50 text-surface-600"
                                        >
                                            <option value="newest">최신순</option>
                                            <option value="learning-rate-asc">학습률 낮은 순</option>
                                            <option value="learning-rate-desc">학습률 높은 순</option>
                                            <option value="status-group">상태별 그룹</option>
                                        </select>
                                    </div>
                                </div>
                                {/* Status summary bar */}
                                {filteredWords.length > 0 && (
                                    <div className="flex items-center gap-3 mt-3 px-1">
                                        {[LEARNING_STATUS.MEMORIZED, LEARNING_STATUS.LEARNING, LEARNING_STATUS.DIFFICULT].map(status => {
                                            const config = LEARNING_STATUS_CONFIG[status];
                                            const count = filteredWords.filter(w => getLearningStatus(w.learningRate) === status).length;
                                            return (
                                                <div key={status} className="flex items-center gap-1.5">
                                                    <span className={`w-2 h-2 rounded-pill ${config.dotColor}`} aria-hidden="true" />
                                                    <span className="text-xs text-surface-500 font-semibold">{config.label}</span>
                                                    <span className={`text-xs font-black ${config.textColor}`}>{count}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                {renderMasonryLayout()}
                            </div>
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
                    </div>
                </div>
            </main>
        </div>
    );
}

export default App;
