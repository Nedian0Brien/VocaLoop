import React, { useState, useEffect, useRef } from 'react';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { updateProfile, deleteUser, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { collection, query, getDocs, writeBatch, doc, setDoc, getDoc } from 'firebase/firestore';
import { AI_PROVIDERS, DEFAULT_AI_SETTINGS } from '../services/aiModelService';
import {
    X,
    Camera,
    User,
    Target,
    Download,
    Trash2,
    LogOut,
    AlertTriangle,
    Save,
    BarChart3,
    FileText,
    Shield,
    Settings as SettingsIcon,
    Folder,
    FolderPlus,
    Edit3,
    MoreVertical
} from './Icons';

const normalizeAiSettings = (value = {}) => {
    const provider = AI_PROVIDERS[value?.provider] ? value.provider : DEFAULT_AI_SETTINGS.provider;
    const providerConfig = AI_PROVIDERS[provider] || AI_PROVIDERS.gemini;

    return {
        provider,
        model: providerConfig.models.includes(value?.model) ? value.model : providerConfig.models[0],
        geminiApiKey: value?.geminiApiKey || '',
        openaiApiKey: value?.openaiApiKey || '',
        claudeApiKey: value?.claudeApiKey || ''
    };
};

const AccountSettings = ({
    user,
    db,
    words,
    folders,
    onClose,
    onLogout,
    showNotification,
    appId,
    getStorageKeyFromEmail,
    onCreateFolder,
    onRenameFolder,
    onDeleteFolder,
    aiSettings,
    onAiSettingsChange
}) => {
    const [activeTab, setActiveTab] = useState('profile');
    const [isLoading, setIsLoading] = useState(false);
    const [userProfile, setUserProfile] = useState(null);
    const fileInputRef = useRef(null);

    // Profile states
    const [displayName, setDisplayName] = useState('');
    const [toeflTarget, setToeflTarget] = useState('');
    const [profilePhotoURL, setProfilePhotoURL] = useState('');
    const [aiProvider, setAiProvider] = useState(DEFAULT_AI_SETTINGS.provider);
    const [aiModel, setAiModel] = useState(DEFAULT_AI_SETTINGS.model);
    const [geminiApiKey, setGeminiApiKey] = useState('');
    const [openaiApiKey, setOpenaiApiKey] = useState('');
    const [claudeApiKey, setClaudeApiKey] = useState('');

    // Delete account states
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');

    // Folder management states
    const [showFolderCreate, setShowFolderCreate] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [newFolderColor, setNewFolderColor] = useState('#3B82F6');
    const [editingFolderId, setEditingFolderId] = useState(null);
    const [editingFolderName, setEditingFolderName] = useState('');

    useEffect(() => {
        loadUserProfile();
    }, [user, db]);

    useEffect(() => {
        const nextAiSettings = normalizeAiSettings(aiSettings);
        setAiProvider(nextAiSettings.provider);
        setAiModel(nextAiSettings.model);
        setGeminiApiKey(nextAiSettings.geminiApiKey);
        setOpenaiApiKey(nextAiSettings.openaiApiKey);
        setClaudeApiKey(nextAiSettings.claudeApiKey);
    }, [aiSettings]);

    const loadUserProfile = async () => {
        if (!user || !db) return;

        setDisplayName(user.displayName || '');
        setProfilePhotoURL(user.photoURL || '');
        setToeflTarget('');
        const normalized = normalizeAiSettings(aiSettings);
        setAiProvider(normalized.provider);
        setAiModel(normalized.model);
        setGeminiApiKey(normalized.geminiApiKey);
        setOpenaiApiKey(normalized.openaiApiKey);
        setClaudeApiKey(normalized.claudeApiKey);

        const userStorageKey = getStorageKeyFromEmail(user.email);
        try {
            const profileDoc = await getDoc(doc(db, 'artifacts', appId, 'users', userStorageKey, 'profile', 'settings'));
            if (profileDoc.exists()) {
                const data = profileDoc.data();
                setUserProfile(data);
                setToeflTarget(data.toeflTarget || '');
                const updatedAiSettings = normalizeAiSettings(data);
                setAiProvider(updatedAiSettings.provider);
                setAiModel(updatedAiSettings.model);
                setGeminiApiKey(updatedAiSettings.geminiApiKey);
                setOpenaiApiKey(updatedAiSettings.openaiApiKey);
                setClaudeApiKey(updatedAiSettings.claudeApiKey);
            }
        } catch (error) {
            console.error('Failed to load profile:', error);
        }
    };

    const handlePhotoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showNotification('파일 크기는 5MB 이하여야 합니다.', 'error');
            return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            showNotification('이미지 파일만 업로드 가능합니다.', 'error');
            return;
        }

        setIsLoading(true);
        try {
            const storage = getStorage();
            const photoRef = storageRef(storage, `profile-photos/${user.uid}/${Date.now()}_${file.name}`);

            await uploadBytes(photoRef, file);
            const photoURL = await getDownloadURL(photoRef);

            await updateProfile(user, { photoURL });
            setProfilePhotoURL(photoURL);

            showNotification('프로필 사진이 업데이트되었습니다.');
        } catch (error) {
            console.error('Photo upload error:', error);
            showNotification('프로필 사진 업로드 실패: ' + error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemovePhoto = async () => {
        if (!user) return;
        if (!window.confirm('프로필 사진을 제거하시겠습니까?')) return;

        setIsLoading(true);
        try {
            // Delete from Storage if it's a Firebase URL
            if (user.photoURL && user.photoURL.includes('firebase')) {
                try {
                    const storage = getStorage();
                    const photoRef = storageRef(storage, user.photoURL);
                    await deleteObject(photoRef);
                } catch (error) {
                    console.warn('Failed to delete old photo:', error);
                }
            }

            await updateProfile(user, { photoURL: '' });
            setProfilePhotoURL('');

            showNotification('프로필 사진이 제거되었습니다.');
        } catch (error) {
            console.error('Remove photo error:', error);
            showNotification('프로필 사진 제거 실패: ' + error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        if (!user || !db) return;

        setIsLoading(true);
        try {
            const userStorageKey = getStorageKeyFromEmail(user.email);
            const resolvedAiSettings = normalizeAiSettings({
                provider: aiProvider,
                model: aiModel,
                geminiApiKey,
                openaiApiKey,
                claudeApiKey
            });

            // Update Firebase Auth profile
            await updateProfile(user, { displayName });

            // Save to Firestore
            await setDoc(doc(db, 'artifacts', appId, 'users', userStorageKey, 'profile', 'settings'), {
                displayName,
                toeflTarget: toeflTarget || null,
                provider: resolvedAiSettings.provider,
                model: resolvedAiSettings.model,
                geminiApiKey: resolvedAiSettings.geminiApiKey || null,
                openaiApiKey: resolvedAiSettings.openaiApiKey || null,
                claudeApiKey: resolvedAiSettings.claudeApiKey || null,
                updatedAt: new Date()
            }, { merge: true });

            onAiSettingsChange?.({
                provider: resolvedAiSettings.provider,
                model: resolvedAiSettings.model,
                geminiApiKey: resolvedAiSettings.geminiApiKey,
                openaiApiKey: resolvedAiSettings.openaiApiKey,
                claudeApiKey: resolvedAiSettings.claudeApiKey
            });

            showNotification('프로필이 저장되었습니다.');
        } catch (error) {
            console.error('Save profile error:', error);
            showNotification('프로필 저장 실패: ' + error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAiProviderChange = (providerId) => {
        const provider = AI_PROVIDERS[providerId] || AI_PROVIDERS.gemini;
        setAiProvider(provider.id);
        setAiModel(provider.models[0]);
    };

    const activeAiProvider = AI_PROVIDERS[aiProvider] || AI_PROVIDERS.gemini;
    const activeAiKeyValue = aiProvider === 'openai'
        ? openaiApiKey
        : aiProvider === 'claude'
            ? claudeApiKey
            : geminiApiKey;
    const isActiveAiKeyMissing = !activeAiKeyValue.trim();

    const handleExportData = async () => {
        try {
            // Create CSV content
            let csvContent = 'Word,Korean Meaning,Pronunciation,Part of Speech,Definitions,Examples,Nuance,Synonyms,Status,Wrong Count,Review Count,Folder\n';

            words.forEach(word => {
                const folderName = word.folderId ? folders.find(f => f.id === word.folderId)?.name || '' : '';
                const definitions = word.definitions?.join('; ') || '';
                const examples = word.examples?.map(ex => `${ex.en} (${ex.ko})`).join('; ') || '';
                const synonyms = word.synonyms?.join(', ') || '';

                csvContent += `"${word.word}","${word.meaning_ko || ''}","${word.pronunciation || ''}","${word.pos || ''}","${definitions}","${examples}","${word.nuance || ''}","${synonyms}","${word.status || ''}","${word.stats?.wrong_count || 0}","${word.stats?.review_count || 0}","${folderName}"\n`;
            });

            // Create download link
            const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `vocaloop-export-${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            showNotification(`${words.length}개의 단어가 내보내기되었습니다.`);
        } catch (error) {
            console.error('Export error:', error);
            showNotification('데이터 내보내기 실패: ' + error.message, 'error');
        }
    };

    const handleResetData = async () => {
        if (!window.confirm('⚠️ 모든 단어와 학습 데이터를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.')) return;
        if (!window.confirm('정말로 모든 데이터를 삭제하시겠습니까? 마지막 확인입니다.')) return;

        if (!user || !db) return;

        setIsLoading(true);
        try {
            const userStorageKey = getStorageKeyFromEmail(user.email);

            // Delete all words
            const wordsQuery = query(collection(db, 'artifacts', appId, 'users', userStorageKey, 'words'));
            const wordsSnapshot = await getDocs(wordsQuery);

            // Delete all folders
            const foldersQuery = query(collection(db, 'artifacts', appId, 'users', userStorageKey, 'folders'));
            const foldersSnapshot = await getDocs(foldersQuery);

            const batch = writeBatch(db);
            wordsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
            foldersSnapshot.docs.forEach(doc => batch.delete(doc.ref));

            await batch.commit();

            showNotification('모든 데이터가 초기화되었습니다.');
        } catch (error) {
            console.error('Reset data error:', error);
            showNotification('데이터 초기화 실패: ' + error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!user || !db) return;

        setIsLoading(true);
        try {
            const userStorageKey = getStorageKeyFromEmail(user.email);

            // For email/password users, re-authenticate first
            if (!user.providerData[0]?.providerId.includes('google')) {
                if (!deletePassword) {
                    showNotification('비밀번호를 입력해주세요.', 'error');
                    setIsLoading(false);
                    return;
                }

                const credential = EmailAuthProvider.credential(user.email, deletePassword);
                await reauthenticateWithCredential(user, credential);
            }

            // Delete user data from Firestore
            const wordsQuery = query(collection(db, 'artifacts', appId, 'users', userStorageKey, 'words'));
            const wordsSnapshot = await getDocs(wordsQuery);

            const foldersQuery = query(collection(db, 'artifacts', appId, 'users', userStorageKey, 'folders'));
            const foldersSnapshot = await getDocs(foldersQuery);

            const batch = writeBatch(db);
            wordsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
            foldersSnapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();

            // Delete profile photo from Storage if exists
            if (user.photoURL && user.photoURL.includes('firebase')) {
                try {
                    const storage = getStorage();
                    const photoRef = storageRef(storage, user.photoURL);
                    await deleteObject(photoRef);
                } catch (error) {
                    console.warn('Failed to delete profile photo:', error);
                }
            }

            // Delete Firebase Auth user
            await deleteUser(user);

            showNotification('계정이 삭제되었습니다.');
            onClose();
        } catch (error) {
            console.error('Delete account error:', error);
            let errorMessage = '계정 삭제 실패: ';

            if (error.code === 'auth/wrong-password') {
                errorMessage += '비밀번호가 올바르지 않습니다.';
            } else if (error.code === 'auth/requires-recent-login') {
                errorMessage += '보안을 위해 다시 로그인 후 시도해주세요.';
            } else {
                errorMessage += error.message;
            }

            showNotification(errorMessage, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // Calculate statistics
    const stats = {
        totalWords: words.length,
        newWords: words.filter(w => w.status === 'NEW').length,
        learning: words.filter(w => w.status === 'LEARNING').length,
        mastered: words.filter(w => w.status === 'MASTERED').length,
        totalReviews: words.reduce((sum, w) => sum + (w.stats?.review_count || 0), 0),
        avgAccuracy: words.length > 0
            ? Math.round((words.reduce((sum, w) => {
                const total = (w.stats?.review_count || 0);
                const wrong = (w.stats?.wrong_count || 0);
                return sum + (total > 0 ? ((total - wrong) / total) * 100 : 0);
            }, 0) / words.length))
            : 0
    };

    const handleCreateFolderSubmit = async () => {
        if (!newFolderName.trim()) return;
        await onCreateFolder(newFolderName.trim(), newFolderColor);
        setNewFolderName('');
        setNewFolderColor('#3B82F6');
        setShowFolderCreate(false);
    };

    const handleRename = async (folderId) => {
        if (!editingFolderName.trim()) return;
        await onRenameFolder(folderId, editingFolderName.trim());
        setEditingFolderId(null);
        setEditingFolderName('');
    };

    const folderColors = [
        { name: 'Blue', value: '#3B82F6' },
        { name: 'Purple', value: '#8B5CF6' },
        { name: 'Pink', value: '#EC4899' },
        { name: 'Red', value: '#EF4444' },
        { name: 'Orange', value: '#F97316' },
        { name: 'Yellow', value: '#EAB308' },
        { name: 'Green', value: '#10B981' },
        { name: 'Teal', value: '#14B8A6' },
    ];

    // Calculate words per folder
    const wordCountByFolder = {};
    words.forEach(w => {
        const fId = w.folderId || '__uncategorized';
        wordCountByFolder[fId] = (wordCountByFolder[fId] || 0) + 1;
    });

    const tabs = [
        { id: 'profile', label: '프로필', icon: User },
        { id: 'stats', label: '통계', icon: BarChart3 },
        { id: 'folders', label: '폴더', icon: Folder },
        { id: 'data', label: '데이터', icon: FileText },
        { id: 'account', label: '계정', icon: Shield }
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <SettingsIcon className="w-6 h-6 text-white" />
                        <h2 className="text-xl font-bold text-white">계정 설정</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 bg-gray-50 px-6">
                    <div className="flex gap-1">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-3 font-medium transition-all ${
                                        activeTab === tab.id
                                            ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                    }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'profile' && (
                        <div className="space-y-6">
                            {/* Profile Photo */}
                            <div className="flex flex-col items-center gap-4 pb-6 border-b border-gray-200">
                                <div className="relative group">
                                    {profilePhotoURL ? (
                                        <img
                                            src={profilePhotoURL}
                                            alt="Profile"
                                            className="w-24 h-24 rounded-full border-4 border-gray-200 object-cover"
                                        />
                                    ) : (
                                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-gray-200">
                                            {displayName?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                                        </div>
                                    )}
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isLoading}
                                        className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                    >
                                        <Camera className="w-4 h-4" />
                                    </button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handlePhotoUpload}
                                        className="hidden"
                                    />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm text-gray-500">프로필 사진</p>
                                    <p className="text-xs text-gray-400 mt-1">클릭하여 변경 (최대 5MB)</p>
                                    {profilePhotoURL && (
                                        <button
                                            onClick={handleRemovePhoto}
                                            disabled={isLoading}
                                            className="text-xs text-red-600 hover:text-red-700 mt-2 disabled:opacity-50"
                                        >
                                            사진 제거
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Display Name */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    이름
                                </label>
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    placeholder="이름을 입력하세요"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* Email (read-only) */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    이메일
                                </label>
                                <input
                                    type="email"
                                    value={user?.email || ''}
                                    disabled
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                                />
                                {user?.metadata?.creationTime && (
                                    <p className="text-xs text-gray-500 mt-1">
                                        가입일: {new Date(user.metadata.creationTime).toLocaleDateString('ko-KR')}
                                    </p>
                                )}
                            </div>

                            {/* TOEFL Target */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    TOEFL 목표 점수
                                </label>
                                <input
                                    type="number"
                                    value={toeflTarget}
                                    onChange={(e) => setToeflTarget(e.target.value)}
                                    placeholder="예: 100"
                                    min="0"
                                    max="120"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">TOEFL iBT 총점 (0-120)</p>
                            </div>

                            {/* AI Provider & Model */}
                            <div className="space-y-4 border border-gray-200 rounded-xl p-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        AI Provider
                                    </label>
                                    <select
                                        value={aiProvider}
                                        onChange={(e) => handleAiProviderChange(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {Object.values(AI_PROVIDERS).map(provider => (
                                            <option key={provider.id} value={provider.id}>{provider.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        모델
                                    </label>
                                    <select
                                        value={aiModel}
                                        onChange={(e) => setAiModel(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {activeAiProvider.models.map((model) => (
                                            <option key={model} value={model}>{model}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* API Keys */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Google AI API Key
                                    </label>
                                    <input
                                        type="password"
                                        value={geminiApiKey}
                                        onChange={(e) => setGeminiApiKey(e.target.value)}
                                        placeholder="Google AI Studio에서 발급받은 키 입력"
                                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${aiProvider === 'gemini' && !geminiApiKey.trim() ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        <a href={AI_PROVIDERS.gemini.keyHelpUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
                                            Google AI Studio
                                        </a>에서 API 키 발급
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        OpenAI API Key
                                    </label>
                                    <input
                                        type="password"
                                        value={openaiApiKey}
                                        onChange={(e) => setOpenaiApiKey(e.target.value)}
                                        placeholder="OpenAI API Keys에서 발급받은 키 입력"
                                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${aiProvider === 'openai' && !openaiApiKey.trim() ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        <a href={AI_PROVIDERS.openai.keyHelpUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
                                            OpenAI API Keys
                                        </a>에서 API 키 발급
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Claude API Key
                                    </label>
                                    <input
                                        type="password"
                                        value={claudeApiKey}
                                        onChange={(e) => setClaudeApiKey(e.target.value)}
                                        placeholder="Anthropic Console에서 발급받은 키 입력"
                                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${aiProvider === 'claude' && !claudeApiKey.trim() ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        <a href={AI_PROVIDERS.claude.keyHelpUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
                                            Anthropic Console
                                        </a>에서 API 키 발급
                                    </p>
                                </div>
                            </div>

                            {isActiveAiKeyMissing && (
                                <p className="text-xs text-red-500 font-medium">
                                    ⚠ 현재 선택한 모델({activeAiProvider.name})을 사용하려면 해당 API Key를 입력해야 합니다.
                                </p>
                            )}

                            {/* Save Button */}
                            <button
                                onClick={handleSaveProfile}
                                disabled={isLoading}
                                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <Save className="w-5 h-5" />
                                프로필 저장
                            </button>
                        </div>
                    )}

                    {activeTab === 'stats' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                                    <p className="text-sm text-blue-600 font-medium mb-1">총 단어 수</p>
                                    <p className="text-3xl font-bold text-blue-700">{stats.totalWords}</p>
                                </div>
                                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                                    <p className="text-sm text-green-600 font-medium mb-1">마스터한 단어</p>
                                    <p className="text-3xl font-bold text-green-700">{stats.mastered}</p>
                                </div>
                                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-xl border border-yellow-200">
                                    <p className="text-sm text-yellow-600 font-medium mb-1">학습 중</p>
                                    <p className="text-3xl font-bold text-yellow-700">{stats.learning}</p>
                                </div>
                                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                                    <p className="text-sm text-purple-600 font-medium mb-1">새 단어</p>
                                    <p className="text-3xl font-bold text-purple-700">{stats.newWords}</p>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm text-gray-600 font-medium">총 복습 횟수</p>
                                    <p className="text-2xl font-bold text-gray-800">{stats.totalReviews}</p>
                                </div>
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-gray-600 font-medium">평균 정답률</p>
                                    <p className="text-2xl font-bold text-gray-800">{stats.avgAccuracy}%</p>
                                </div>
                            </div>

                            {toeflTarget && (
                                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-200">
                                    <div className="flex items-center gap-3">
                                        <Target className="w-6 h-6 text-indigo-600" />
                                        <div>
                                            <p className="text-sm text-indigo-600 font-medium">TOEFL 목표</p>
                                            <p className="text-2xl font-bold text-indigo-700">{toeflTarget}점</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                                <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4" />
                                    학습 진도
                                </h4>
                                <div className="space-y-2">
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-blue-700">마스터 진행률</span>
                                            <span className="font-semibold text-blue-900">
                                                {words.length > 0 ? Math.round((stats.mastered / words.length) * 100) : 0}%
                                            </span>
                                        </div>
                                        <div className="w-full bg-blue-200 rounded-full h-2">
                                            <div
                                                className="bg-blue-600 h-2 rounded-full transition-all"
                                                style={{ width: `${words.length > 0 ? (stats.mastered / words.length) * 100 : 0}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-green-700">학습 중 + 마스터</span>
                                            <span className="font-semibold text-green-900">
                                                {words.length > 0 ? Math.round(((stats.learning + stats.mastered) / words.length) * 100) : 0}%
                                            </span>
                                        </div>
                                        <div className="w-full bg-green-200 rounded-full h-2">
                                            <div
                                                className="bg-green-600 h-2 rounded-full transition-all"
                                                style={{ width: `${words.length > 0 ? ((stats.learning + stats.mastered) / words.length) * 100 : 0}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                <p className="text-sm text-blue-800">
                                    <strong>학습 팁:</strong> 꾸준한 복습이 중요합니다. 매일 조금씩 학습하는 것이 한 번에 많이 공부하는 것보다 효과적입니다.
                                </p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'data' && (
                        <div className="space-y-4">
                            {/* Export Data */}
                            <div className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-colors">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-blue-100 rounded-lg">
                                        <Download className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900 mb-1">데이터 내보내기</h3>
                                        <p className="text-sm text-gray-600 mb-3">
                                            모든 단어와 학습 데이터를 CSV 파일로 다운로드합니다.
                                        </p>
                                        <button
                                            onClick={handleExportData}
                                            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm flex items-center gap-2"
                                        >
                                            <Download className="w-4 h-4" />
                                            CSV 파일 다운로드
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Reset Data */}
                            <div className="border border-orange-200 rounded-xl p-4 hover:border-orange-300 transition-colors bg-orange-50">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-orange-100 rounded-lg">
                                        <Trash2 className="w-6 h-6 text-orange-600" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900 mb-1">데이터 초기화</h3>
                                        <p className="text-sm text-gray-600 mb-3">
                                            모든 단어와 폴더를 삭제합니다. 이 작업은 되돌릴 수 없습니다.
                                        </p>
                                        <button
                                            onClick={handleResetData}
                                            disabled={isLoading}
                                            className="bg-orange-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-700 transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            모든 데이터 삭제
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'folders' && (
                        <div className="space-y-4">
                            {/* Create Folder Button */}
                            <button
                                onClick={() => setShowFolderCreate(!showFolderCreate)}
                                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                            >
                                <FolderPlus className="w-5 h-5" />
                                새 폴더 만들기
                            </button>

                            {/* Create Folder Form */}
                            {showFolderCreate && (
                                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                                    <input
                                        type="text"
                                        value={newFolderName}
                                        onChange={(e) => setNewFolderName(e.target.value)}
                                        placeholder="폴더 이름"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <div>
                                        <p className="text-sm font-medium text-gray-700 mb-2">폴더 색상</p>
                                        <div className="flex gap-2 flex-wrap">
                                            {folderColors.map(color => (
                                                <button
                                                    key={color.value}
                                                    onClick={() => setNewFolderColor(color.value)}
                                                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                                                        newFolderColor === color.value ? 'border-gray-900 scale-110' : 'border-gray-300'
                                                    }`}
                                                    style={{ backgroundColor: color.value }}
                                                    title={color.name}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleCreateFolderSubmit}
                                            disabled={!newFolderName.trim()}
                                            className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            생성
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowFolderCreate(false);
                                                setNewFolderName('');
                                                setNewFolderColor('#3B82F6');
                                            }}
                                            className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                                        >
                                            취소
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Folders List */}
                            <div className="space-y-2">
                                {folders.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Folder className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500">생성된 폴더가 없습니다.</p>
                                    </div>
                                ) : (
                                    folders.map(folder => (
                                        <div
                                            key={folder.id}
                                            className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                                                    style={{ backgroundColor: folder.color + '20' }}
                                                >
                                                    <Folder className="w-5 h-5" style={{ color: folder.color }} />
                                                </div>
                                                <div className="flex-1">
                                                    {editingFolderId === folder.id ? (
                                                        <input
                                                            type="text"
                                                            value={editingFolderName}
                                                            onChange={(e) => setEditingFolderName(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') handleRename(folder.id);
                                                                if (e.key === 'Escape') {
                                                                    setEditingFolderId(null);
                                                                    setEditingFolderName('');
                                                                }
                                                            }}
                                                            className="w-full px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <>
                                                            <h4 className="font-semibold text-gray-900">{folder.name}</h4>
                                                            <p className="text-sm text-gray-500">
                                                                {wordCountByFolder[folder.id] || 0}개의 단어
                                                            </p>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="flex gap-1">
                                                    {editingFolderId === folder.id ? (
                                                        <>
                                                            <button
                                                                onClick={() => handleRename(folder.id)}
                                                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                                title="저장"
                                                            >
                                                                <Save className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setEditingFolderId(null);
                                                                    setEditingFolderName('');
                                                                }}
                                                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                                                title="취소"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    setEditingFolderId(folder.id);
                                                                    setEditingFolderName(folder.name);
                                                                }}
                                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                title="이름 변경"
                                                            >
                                                                <Edit3 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    if (window.confirm(`'${folder.name}' 폴더를 삭제하시겠습니까?\n\n폴더 내 단어들은 미분류로 이동됩니다.`)) {
                                                                        onDeleteFolder(folder.id);
                                                                    }
                                                                }}
                                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="삭제"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'account' && (
                        <div className="space-y-4">
                            {/* Logout */}
                            <div className="border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-gray-100 rounded-lg">
                                        <LogOut className="w-6 h-6 text-gray-600" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900 mb-1">로그아웃</h3>
                                        <p className="text-sm text-gray-600 mb-3">
                                            현재 세션에서 로그아웃합니다. 데이터는 보존됩니다.
                                        </p>
                                        <button
                                            onClick={() => {
                                                onLogout();
                                                onClose();
                                            }}
                                            className="bg-gray-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors text-sm flex items-center gap-2"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            로그아웃
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Delete Account */}
                            <div className="border border-red-200 rounded-xl p-4 hover:border-red-300 transition-colors bg-red-50">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-red-100 rounded-lg">
                                        <AlertTriangle className="w-6 h-6 text-red-600" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-red-900 mb-1">회원 탈퇴</h3>
                                        <p className="text-sm text-red-700 mb-3">
                                            계정과 모든 데이터를 영구적으로 삭제합니다. 이 작업은 되돌릴 수 없습니다.
                                        </p>

                                        {!showDeleteConfirm ? (
                                            <button
                                                onClick={() => setShowDeleteConfirm(true)}
                                                className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors text-sm flex items-center gap-2"
                                            >
                                                <AlertTriangle className="w-4 h-4" />
                                                회원 탈퇴
                                            </button>
                                        ) : (
                                            <div className="space-y-3">
                                                {!user?.providerData[0]?.providerId.includes('google') && (
                                                    <input
                                                        type="password"
                                                        value={deletePassword}
                                                        onChange={(e) => setDeletePassword(e.target.value)}
                                                        placeholder="비밀번호를 입력하세요"
                                                        className="w-full px-4 py-2 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                                    />
                                                )}
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={handleDeleteAccount}
                                                        disabled={isLoading}
                                                        className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors text-sm disabled:opacity-50"
                                                    >
                                                        확인 - 계정 삭제
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setShowDeleteConfirm(false);
                                                            setDeletePassword('');
                                                        }}
                                                        className="px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm"
                                                    >
                                                        취소
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AccountSettings;
