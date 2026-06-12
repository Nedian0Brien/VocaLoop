import React, { Suspense, useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';

// Components
import Header from './components/Header';
import LoginScreen from './components/LoginScreen';
import VocabularyDashboard from './components/VocabularyDashboard';
import FolderDeleteDialog from './components/FolderDeleteDialog';
import { Loader2, Check, RotateCw } from './components/Icons';

// Hooks & Services
import useWindowSize from './hooks/useWindowSize';
import { useAppNotifications } from './hooks/useAppNotifications';
import { useAppSessionData } from './hooks/useAppSessionData';
import { useFolderCommands } from './hooks/useFolderCommands';
import useThemePreference from './hooks/useThemePreference';
import { useVocabularyCommands } from './hooks/useVocabularyCommands';
import { AI_PROVIDERS, DEFAULT_AI_SETTINGS, getActiveAiConfig } from './services/aiModelService';
import { getDictionaryAutocompleteSuggestions } from './services/dictionaryAutocompleteService';
import { wordBelongsToFolder } from './utils/appDataTransforms';

const AccountSettings = React.lazy(() => import('./components/AccountSettings'));
const QuizView = React.lazy(() => import('./components/QuizView'));
const ToeflReviewView = React.lazy(() => import('./components/ToeflReviewView'));

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
const PATH_TO_VIEW = { '/study': 'study', '/review': 'review', '/settings': 'settings', '/dashboard': 'dashboard' };
const VIEW_TO_PATH = { study: '/study', review: '/review', settings: '/settings', dashboard: '/' };

const getViewFromPath = () =>
    PATH_TO_VIEW[window.location.pathname] ?? 'dashboard';

const RouteFallback = ({ label = 'Loading view...' }) => (
    <div className="flex min-h-[320px] items-center justify-center text-center text-surface-500">
        <div>
            <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-brand-600" aria-hidden="true" />
            <p className="text-sm font-bold">{label}</p>
        </div>
    </div>
);

// --- Main App Component ---
function App() {
    const [view, setView] = useState(getViewFromPath);
    const [pendingToeflReviewAsset, setPendingToeflReviewAsset] = useState(null);
    const { themeMode, resolvedTheme, setThemeMode } = useThemePreference();

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
    const [inputWord, setInputWord] = useState('');
    const [isWordSuggestOpen, setIsWordSuggestOpen] = useState(false);
    const [wordAutocompleteSuggestions, setWordAutocompleteSuggestions] = useState([]);
    const [wordSuggestionPanelStyle, setWordSuggestionPanelStyle] = useState({});
    const [aiMode, setAiMode] = useState(false);
    const [sortMode, setSortMode] = useState('newest');
    const [folderDeleteId, setFolderDeleteId] = useState(null);
    const [isDeletingFolder, setIsDeletingFolder] = useState(false);

    const windowSize = useWindowSize();
    const wordInputRef = useRef(null);
    const { notification, showNotification } = useAppNotifications();
    const {
        accountAiSettings,
        clearSessionState,
        folders,
        handleDataReset: handleSessionDataReset,
        handleEmailLogin,
        handleEmailSignup,
        handleLogout,
        handleUserUpdate,
        loading,
        loginLoading,
        selectedFolderId,
        setAccountAiSettings,
        setFolders,
        setSelectedFolderId,
        setWords,
        user,
        words,
    } = useAppSessionData({
        defaultAiSettings: DEFAULT_AI_SETTINGS_LOADED,
        showNotification,
    });
    const activeAiConfig = useMemo(() => getActiveAiConfig(accountAiSettings), [accountAiSettings]);
    const activeAiProvider = AI_PROVIDERS[activeAiConfig.provider] || AI_PROVIDERS[DEFAULT_AI_SETTINGS.provider];
    const {
        addToFolderId,
        bulkAddProgress,
        handleAddWord,
        handleBulkAddWords,
        handleDeleteWord,
        handleExplainVocabularyWord,
        handleAcceptQuizAnswer,
        handleMoveWord,
        handleToggleWordFlag,
        handleRegenerateWord,
        handleSaveVocabularyWord,
        handleUpdateLearningRate,
        isAnalyzing,
        clearAddToFolderIfFolder,
        resetAddToFolder,
        setAddToFolderId,
    } = useVocabularyCommands({
        activeAiConfig,
        activeAiProvider,
        folders,
        inputWord,
        selectedFolderId,
        setInputWord,
        setIsWordSuggestOpen,
        setWords,
        showNotification,
        user,
        words,
    });
    const {
        handleCreateFolder,
        handleDeleteFolder,
        handleRenameFolder,
        handleReorderFolders,
        handleUpdateFolder,
    } = useFolderCommands({
        clearAddToFolderIfFolder,
        setFolders,
        setSelectedFolderId,
        setWords,
        showNotification,
        user,
    });
    const folderPendingDelete = useMemo(
        () => folders.find((folder) => folder.id === folderDeleteId) || null,
        [folderDeleteId, folders],
    );
    const folderPendingDeleteWordCount = useMemo(
        () => (folderPendingDelete ? words.filter((word) => wordBelongsToFolder(word, folderPendingDelete.id)).length : 0),
        [folderPendingDelete, words],
    );
    const requestDeleteFolder = useCallback((folderId) => {
        setFolderDeleteId(folderId);
    }, []);
    const cancelDeleteFolder = useCallback(() => {
        if (!isDeletingFolder) setFolderDeleteId(null);
    }, [isDeletingFolder]);
    const confirmDeleteFolder = useCallback(async ({ deleteWords }) => {
        if (!folderPendingDelete) return;
        setIsDeletingFolder(true);
        try {
            const deleted = await handleDeleteFolder(folderPendingDelete.id, { deleteWords });
            if (deleted) setFolderDeleteId(null);
        } finally {
            setIsDeletingFolder(false);
        }
    }, [folderPendingDelete, handleDeleteFolder]);
    const handleBulkAddWordsWithFolder = useCallback(async ({ words: bulkWords, folderId, newFolderName }) => {
        let targetFolderId = folderId;
        if (newFolderName) {
            const createdFolder = await handleCreateFolder(newFolderName, 'blue', null);
            if (!createdFolder) {
                throw new Error('폴더를 만들지 못했습니다.');
            }
            targetFolderId = createdFolder.id;
        }
        return handleBulkAddWords({ words: bulkWords, folderId: targetFolderId });
    }, [handleBulkAddWords, handleCreateFolder]);
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

    const handleDataReset = () => {
        handleSessionDataReset();
        resetAddToFolder();
    };

    const handleAccountDeleted = () => clearSessionState();

    const handleStartToeflAssetReview = useCallback((asset) => {
        if (!asset) return;
        setPendingToeflReviewAsset(asset);
        navigate('study');
    }, [navigate]);

    const NotificationToast = () => notification ? (
        <div className={`fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-4 z-50 flex items-center gap-2 rounded-md px-4 py-3 font-bold text-white shadow-[var(--shadow-elevated)] animate-bounce sm:bottom-4 ${
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
                data-portal-root="document-body"
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
        <div className="min-h-screen pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:pb-20">
            <Header
                view={view}
                setView={navigate}
                user={user}
                themeMode={themeMode}
                resolvedTheme={resolvedTheme}
                setThemeMode={setThemeMode}
            />
            <NotificationToast />
            {wordSuggestionPortal}
            <FolderDeleteDialog
                folder={folderPendingDelete}
                wordCount={folderPendingDeleteWordCount}
                isDeleting={isDeletingFolder}
                onCancel={cancelDeleteFolder}
                onConfirm={confirmDeleteFolder}
            />

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
                        bulkAddProgress={bulkAddProgress}
                        onAddWord={handleAddWord}
                        onBulkAddWords={handleBulkAddWordsWithFolder}
                        addToFolderId={addToFolderId}
                        setAddToFolderId={setAddToFolderId}
                        sortMode={sortMode}
                        setSortMode={setSortMode}
                        onCreateFolder={handleCreateFolder}
                        onUpdateFolder={handleUpdateFolder}
                        onDeleteFolder={requestDeleteFolder}
                        onReorderFolders={handleReorderFolders}
                        onDeleteWord={handleDeleteWord}
                        onMoveWord={handleMoveWord}
                        onToggleWordFlag={handleToggleWordFlag}
                        onRegenerateWord={handleRegenerateWord}
                    />
                )}
                {view === 'study' && (
                    <Suspense fallback={<RouteFallback label="Loading study..." />}>
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
                            onAcceptedAnswer={handleAcceptQuizAnswer}
                            initialReviewAsset={pendingToeflReviewAsset}
                            onInitialReviewAssetConsumed={() => setPendingToeflReviewAsset(null)}
                        />
                    </Suspense>
                )}
                {view === 'review' && (
                    <Suspense fallback={<RouteFallback label="Loading review..." />}>
                        <ToeflReviewView onStartAssetReview={handleStartToeflAssetReview} />
                    </Suspense>
                )}
                {view === 'settings' && (
                    <Suspense fallback={<RouteFallback label="Loading settings..." />}>
                        <AccountSettings
                            variant="page"
                            user={user}
                            words={words}
                            folders={folders}
                            onClose={() => navigate('dashboard')}
                            onLogout={handleLogout}
                            showNotification={showNotification}
                            aiSettings={accountAiSettings}
                            onAiSettingsChange={setAccountAiSettings}
                            onCreateFolder={handleCreateFolder}
                            onRenameFolder={handleRenameFolder}
                            onDeleteFolder={requestDeleteFolder}
                            onUserUpdate={handleUserUpdate}
                            onDataReset={handleDataReset}
                            onAccountDeleted={handleAccountDeleted}
                        />
                    </Suspense>
                )}
            </main>
        </div>
    );
}

export default App;
