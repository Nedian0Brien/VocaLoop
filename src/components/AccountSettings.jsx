import React, { useState, useEffect, useRef } from 'react';
import { AI_PROVIDERS, DEFAULT_AI_SETTINGS } from '../services/aiModelService';
import { getSettings, updateSettings } from '../services/settingsApi';
import { uploadProfileImage, deleteProfileImage } from '../services/uploadApi';
import { deleteAccount, resetAccountData } from '../services/accountApi';
import {
    X, Camera, User, Target, Download, Trash2, LogOut, AlertTriangle, Save, BarChart3,
    FileText, Shield, Settings as SettingsIcon, Folder, FolderPlus, Edit3,
} from './Icons';
import { Button, Stat } from '../design-system';

const normalizeAiSettings = (value = {}) => {
    const provider = AI_PROVIDERS[value?.provider] ? value.provider : DEFAULT_AI_SETTINGS.provider;
    const providerConfig = AI_PROVIDERS[provider] || AI_PROVIDERS.gemini;

    return {
        provider,
        model: providerConfig.models.includes(value?.model) ? value.model : providerConfig.models[0],
        geminiApiKey: value?.geminiApiKey || '',
        openaiApiKey: value?.openaiApiKey || '',
        claudeApiKey: value?.claudeApiKey || '',
    };
};

const ActionCard = ({ tone = 'neutral', icon: Icon, title, desc, children }) => {
    const tones = {
        neutral: { card: 'border-surface-200 hover:border-surface-300',           iconWrap: 'bg-surface-100 text-surface-600',  title: 'text-surface-900', desc: 'text-surface-600' },
        brand:   { card: 'border-surface-200 hover:border-brand-300',             iconWrap: 'bg-brand-100   text-brand-600',    title: 'text-surface-900', desc: 'text-surface-600' },
        warning: { card: 'border-warning-200 hover:border-warning-300 bg-warning-50', iconWrap: 'bg-warning-100 text-warning-600', title: 'text-surface-900', desc: 'text-surface-600' },
        danger:  { card: 'border-danger-200 hover:border-danger-300 bg-danger-50', iconWrap: 'bg-danger-100  text-danger-600',    title: 'text-danger-900',  desc: 'text-danger-700' },
    }[tone];

    return (
        <div className={`border ${tones.card} rounded-xl p-4 transition-colors`}>
            <div className="flex items-start gap-4">
                <div className={`p-3 rounded-md ${tones.iconWrap}`}>
                    <Icon className="w-6 h-6" aria-hidden="true" />
                </div>
                <div className="flex-1">
                    <h3 className={`font-black tracking-tight mb-1 ${tones.title}`}>{title}</h3>
                    <p className={`text-sm mb-3 ${tones.desc}`}>{desc}</p>
                    {children}
                </div>
            </div>
        </div>
    );
};

const AccountSettings = ({
    user, words, folders, onClose, onLogout, showNotification,
    onCreateFolder, onRenameFolder, onDeleteFolder,
    aiSettings, onAiSettingsChange, onUserUpdate, onDataReset, onAccountDeleted,
}) => {
    const [activeTab, setActiveTab] = useState('profile');
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef(null);

    const [displayName, setDisplayName] = useState('');
    const [toeflTarget, setToeflTarget] = useState('');
    const [profilePhotoURL, setProfilePhotoURL] = useState('');
    const [aiProvider, setAiProvider] = useState(DEFAULT_AI_SETTINGS.provider);
    const [aiModel, setAiModel] = useState(DEFAULT_AI_SETTINGS.model);
    const [geminiApiKey, setGeminiApiKey] = useState('');
    const [openaiApiKey, setOpenaiApiKey] = useState('');
    const [claudeApiKey, setClaudeApiKey] = useState('');

    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');

    const [showFolderCreate, setShowFolderCreate] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [newFolderColor, setNewFolderColor] = useState('#3B82F6');
    const [editingFolderId, setEditingFolderId] = useState(null);
    const [editingFolderName, setEditingFolderName] = useState('');

    useEffect(() => { loadUserProfile(); }, [user]);

    useEffect(() => {
        const next = normalizeAiSettings(aiSettings);
        setAiProvider(next.provider);
        setAiModel(next.model);
        setGeminiApiKey(next.geminiApiKey);
        setOpenaiApiKey(next.openaiApiKey);
        setClaudeApiKey(next.claudeApiKey);
    }, [aiSettings]);

    const loadUserProfile = async () => {
        if (!user) return;
        setDisplayName(user.displayName || '');
        setProfilePhotoURL(user.photoURL || '');
        setToeflTarget('');

        try {
            const data = await getSettings();
            if (!data) return;
            if (data.displayName != null) setDisplayName(data.displayName);
            setToeflTarget(data.toeflTarget == null ? '' : String(data.toeflTarget));

            const next = normalizeAiSettings(data);
            setAiProvider(next.provider);
            setAiModel(next.model);
            setGeminiApiKey(next.geminiApiKey);
            setOpenaiApiKey(next.openaiApiKey);
            setClaudeApiKey(next.claudeApiKey);
        } catch (error) {
            console.error('Failed to load profile:', error);
        }
    };

    const handlePhotoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;
        if (file.size > 5 * 1024 * 1024) {
            showNotification('파일 크기는 5MB 이하여야 합니다.', 'error');
            return;
        }
        if (!file.type.startsWith('image/')) {
            showNotification('이미지 파일만 업로드 가능합니다.', 'error');
            return;
        }

        setIsLoading(true);
        try {
            const { photo_url: photoUrl } = await uploadProfileImage(file);
            setProfilePhotoURL(photoUrl || '');
            onUserUpdate?.({ photoURL: photoUrl || null });
            showNotification('프로필 사진이 업데이트되었습니다.');
        } catch (error) {
            console.error('Photo upload error:', error);
            showNotification('프로필 사진 업로드 실패: ' + error.message, 'error');
        } finally {
            setIsLoading(false);
            if (e.target) e.target.value = '';
        }
    };

    const handleRemovePhoto = async () => {
        if (!user) return;
        if (!window.confirm('프로필 사진을 제거하시겠습니까?')) return;
        setIsLoading(true);
        try {
            await deleteProfileImage();
            setProfilePhotoURL('');
            onUserUpdate?.({ photoURL: null });
            showNotification('프로필 사진이 제거되었습니다.');
        } catch (error) {
            console.error('Remove photo error:', error);
            showNotification('프로필 사진 제거 실패: ' + error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const resolved = normalizeAiSettings({
                provider: aiProvider, model: aiModel, geminiApiKey, openaiApiKey, claudeApiKey,
            });

            const payload = {
                displayName: displayName?.trim() ? displayName.trim() : null,
                toeflTarget: toeflTarget === '' ? null : Number(toeflTarget),
                provider: resolved.provider,
                model: resolved.model,
                geminiApiKey: resolved.geminiApiKey?.trim() ? resolved.geminiApiKey.trim() : null,
                openaiApiKey: resolved.openaiApiKey?.trim() ? resolved.openaiApiKey.trim() : null,
                claudeApiKey: resolved.claudeApiKey?.trim() ? resolved.claudeApiKey.trim() : null,
            };

            const updated = await updateSettings(payload);
            const normalizedUpdated = normalizeAiSettings(updated);
            if (updated?.displayName != null) setDisplayName(updated.displayName);
            setToeflTarget(updated?.toeflTarget == null ? '' : String(updated.toeflTarget));
            setAiProvider(normalizedUpdated.provider);
            setAiModel(normalizedUpdated.model);
            setGeminiApiKey(normalizedUpdated.geminiApiKey);
            setOpenaiApiKey(normalizedUpdated.openaiApiKey);
            setClaudeApiKey(normalizedUpdated.claudeApiKey);

            onAiSettingsChange?.(normalizedUpdated);
            onUserUpdate?.({
                displayName: updated?.displayName ?? (displayName?.trim() ? displayName.trim() : null),
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
    const activeAiKeyValue = aiProvider === 'openai' ? openaiApiKey
        : aiProvider === 'claude' ? claudeApiKey : geminiApiKey;
    const isActiveAiKeyMissing = !activeAiKeyValue.trim();

    const handleExportData = async () => {
        try {
            let csvContent = 'Word,Korean Meaning,Pronunciation,Part of Speech,Definitions,Examples,Nuance,Synonyms,Status,Wrong Count,Review Count,Folder\n';
            words.forEach(word => {
                const folderName = word.folderId ? folders.find(f => f.id === word.folderId)?.name || '' : '';
                const definitions = word.definitions?.join('; ') || '';
                const examples = word.examples?.map(ex => `${ex.en} (${ex.ko})`).join('; ') || '';
                const synonyms = word.synonyms?.join(', ') || '';
                csvContent += `"${word.word}","${word.meaning_ko || ''}","${word.pronunciation || ''}","${word.pos || ''}","${definitions}","${examples}","${word.nuance || ''}","${synonyms}","${word.status || ''}","${word.stats?.wrong_count || 0}","${word.stats?.review_count || 0}","${folderName}"\n`;
            });

            const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
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
        if (!user) return;

        setIsLoading(true);
        try {
            await resetAccountData();
            onDataReset?.();
            showNotification('모든 데이터가 초기화되었습니다.');
        } catch (error) {
            console.error('Reset data error:', error);
            showNotification('데이터 초기화 실패: ' + error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            if (!deletePassword) {
                showNotification('비밀번호를 입력해주세요.', 'error');
                setIsLoading(false);
                return;
            }
            await deleteAccount({ password: deletePassword });
            showNotification('계정이 삭제되었습니다.');
            onAccountDeleted?.();
            onClose();
        } catch (error) {
            console.error('Delete account error:', error);
            showNotification('계정 삭제 실패: ' + error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const stats = {
        totalWords: words.length,
        newWords:   words.filter(w => w.status === 'NEW').length,
        learning:   words.filter(w => w.status === 'LEARNING').length,
        mastered:   words.filter(w => w.status === 'MASTERED').length,
        totalReviews: words.reduce((sum, w) => sum + (w.stats?.review_count || 0), 0),
        avgAccuracy: words.length > 0
            ? Math.round((words.reduce((sum, w) => {
                const total = (w.stats?.review_count || 0);
                const wrong = (w.stats?.wrong_count || 0);
                return sum + (total > 0 ? ((total - wrong) / total) * 100 : 0);
            }, 0) / words.length))
            : 0,
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
        { name: 'Blue',   value: '#3B82F6' },
        { name: 'Purple', value: '#8B5CF6' },
        { name: 'Pink',   value: '#EC4899' },
        { name: 'Red',    value: '#EF4444' },
        { name: 'Orange', value: '#F97316' },
        { name: 'Yellow', value: '#EAB308' },
        { name: 'Green',  value: '#10B981' },
        { name: 'Teal',   value: '#14B8A6' },
    ];

    const wordCountByFolder = {};
    words.forEach(w => {
        const fId = w.folderId || '__uncategorized';
        wordCountByFolder[fId] = (wordCountByFolder[fId] || 0) + 1;
    });

    const tabs = [
        { id: 'profile', label: '프로필', icon: User },
        { id: 'stats',   label: '통계',   icon: BarChart3 },
        { id: 'folders', label: '폴더',   icon: Folder },
        { id: 'data',    label: '데이터', icon: FileText },
        { id: 'account', label: '계정',   icon: Shield },
    ];

    const labelClass = 'block text-sm font-bold text-surface-700 mb-2';
    const inputClass = 'w-full px-4 py-2 border border-surface-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500';

    return (
        <div className="fixed inset-0 bg-surface-900/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
            <div className="bg-white rounded-card shadow-[var(--shadow-floating)] max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-brand-600 to-indigo-pair-600 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <SettingsIcon className="w-6 h-6 text-white" aria-hidden="true" />
                        <h2 className="text-xl font-black text-white tracking-tight">계정 설정</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white hover:bg-white/20 rounded-md p-2 transition-colors"
                        aria-label="설정 닫기"
                    >
                        <X className="w-5 h-5" aria-hidden="true" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="border-b border-surface-200 bg-surface-50 px-6">
                    <div className="flex gap-1">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-3 font-bold transition-all ${
                                        isActive
                                            ? 'text-brand-600 border-b-2 border-brand-600 bg-white'
                                            : 'text-surface-500 hover:text-surface-700 hover:bg-surface-100'
                                    }`}
                                >
                                    <Icon className="w-4 h-4" aria-hidden="true" />
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
                            <div className="flex flex-col items-center gap-4 pb-6 border-b border-surface-200">
                                <div className="relative group">
                                    {profilePhotoURL ? (
                                        <img
                                            src={profilePhotoURL}
                                            alt="Profile"
                                            className="w-24 h-24 rounded-pill border-4 border-surface-200 object-cover"
                                        />
                                    ) : (
                                        <div className="w-24 h-24 rounded-pill bg-gradient-to-br from-brand-500 to-indigo-pair-600 flex items-center justify-center text-white text-3xl font-black border-4 border-surface-200">
                                            {displayName?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                                        </div>
                                    )}
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isLoading}
                                        aria-label="프로필 사진 변경"
                                        className="absolute bottom-0 right-0 bg-brand-600 text-white p-2 rounded-pill shadow-[var(--shadow-elevated)] hover:bg-brand-700 transition-colors disabled:opacity-50"
                                    >
                                        <Camera className="w-4 h-4" aria-hidden="true" />
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
                                    <p className="text-sm font-bold text-surface-500">프로필 사진</p>
                                    <p className="text-xs text-surface-400 mt-1">클릭하여 변경 (최대 5MB)</p>
                                    {profilePhotoURL && (
                                        <button
                                            onClick={handleRemovePhoto}
                                            disabled={isLoading}
                                            className="text-xs font-bold text-danger-600 hover:text-danger-700 mt-2 disabled:opacity-50"
                                        >
                                            사진 제거
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>이름</label>
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    placeholder="이름을 입력하세요"
                                    className={inputClass}
                                />
                            </div>

                            <div>
                                <label className={labelClass}>이메일</label>
                                <input
                                    type="email"
                                    value={user?.email || ''}
                                    disabled
                                    className="w-full px-4 py-2 border border-surface-200 rounded-md bg-surface-50 text-surface-500"
                                />
                                {user?.metadata?.creationTime && (
                                    <p className="text-xs text-surface-500 mt-1">
                                        가입일: {new Date(user.metadata.creationTime).toLocaleDateString('ko-KR')}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className={labelClass}>TOEFL 목표 점수</label>
                                <input
                                    type="number"
                                    value={toeflTarget}
                                    onChange={(e) => setToeflTarget(e.target.value)}
                                    placeholder="예: 100"
                                    min="0"
                                    max="120"
                                    className={inputClass}
                                />
                                <p className="text-xs text-surface-500 mt-1">TOEFL iBT 총점 (0-120)</p>
                            </div>

                            <div className="space-y-4 border border-surface-200 rounded-xl p-4">
                                <div>
                                    <label className={labelClass}>AI Provider</label>
                                    <select
                                        value={aiProvider}
                                        onChange={(e) => handleAiProviderChange(e.target.value)}
                                        className={inputClass}
                                    >
                                        {Object.values(AI_PROVIDERS).map(provider => (
                                            <option key={provider.id} value={provider.id}>{provider.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className={labelClass}>모델</label>
                                    <select
                                        value={aiModel}
                                        onChange={(e) => setAiModel(e.target.value)}
                                        className={inputClass}
                                    >
                                        {activeAiProvider.models.map((model) => (
                                            <option key={model} value={model}>{model}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {[
                                    { key: 'gemini', label: 'Google AI API Key',  value: geminiApiKey, setter: setGeminiApiKey, placeholder: 'Google AI Studio에서 발급받은 키 입력', linkText: 'Google AI Studio' },
                                    { key: 'openai', label: 'OpenAI API Key',     value: openaiApiKey, setter: setOpenaiApiKey, placeholder: 'OpenAI API Keys에서 발급받은 키 입력',   linkText: 'OpenAI API Keys' },
                                    { key: 'claude', label: 'Claude API Key',     value: claudeApiKey, setter: setClaudeApiKey, placeholder: 'Anthropic Console에서 발급받은 키 입력', linkText: 'Anthropic Console' },
                                ].map(({ key, label, value, setter, placeholder, linkText }) => (
                                    <div key={key}>
                                        <label className={labelClass}>{label}</label>
                                        <input
                                            type="password"
                                            value={value}
                                            onChange={(e) => setter(e.target.value)}
                                            placeholder={placeholder}
                                            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                                                aiProvider === key && !value.trim() ? 'border-danger-300 bg-danger-50' : 'border-surface-300'
                                            }`}
                                        />
                                        <p className="text-xs text-surface-500 mt-1">
                                            <a href={AI_PROVIDERS[key].keyHelpUrl} target="_blank" rel="noopener noreferrer" className="text-brand-500 underline">
                                                {linkText}
                                            </a>에서 API 키 발급
                                        </p>
                                    </div>
                                ))}
                            </div>

                            {isActiveAiKeyMissing && (
                                <p className="text-xs text-danger-500 font-bold">
                                    ⚠ 현재 선택한 모델({activeAiProvider.name})을 사용하려면 해당 API Key를 입력해야 합니다.
                                </p>
                            )}

                            <Button
                                variant="primary"
                                size="lg"
                                fullWidth
                                disabled={isLoading}
                                onClick={handleSaveProfile}
                                leftIcon={Save}
                            >
                                프로필 저장
                            </Button>
                        </div>
                    )}

                    {activeTab === 'stats' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <Stat title="총 단어 수"      value={stats.totalWords} icon={BarChart3} tone="brand"   />
                                <Stat title="마스터한 단어"   value={stats.mastered}   icon={Target}    tone="success" />
                                <Stat title="학습 중"         value={stats.learning}   icon={Edit3}     tone="warning" />
                                <Stat title="새 단어"         value={stats.newWords}   icon={FileText}  tone="accent"  />
                            </div>

                            <div className="bg-surface-50 p-4 rounded-xl border border-surface-200">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-bold text-surface-600">총 복습 횟수</p>
                                    <p className="text-2xl font-black text-surface-800">{stats.totalReviews}</p>
                                </div>
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-bold text-surface-600">평균 정답률</p>
                                    <p className="text-2xl font-black text-surface-800">{stats.avgAccuracy}%</p>
                                </div>
                            </div>

                            {toeflTarget && (
                                <div className="bg-gradient-to-r from-indigo-pair-500/10 to-accent-500/10 p-4 rounded-xl border border-indigo-pair-500/20">
                                    <div className="flex items-center gap-3">
                                        <Target className="w-6 h-6 text-indigo-pair-600" aria-hidden="true" />
                                        <div>
                                            <p className="text-sm font-bold text-indigo-pair-600">TOEFL 목표</p>
                                            <p className="text-2xl font-black text-indigo-pair-700">{toeflTarget}점</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="bg-gradient-to-r from-brand-50 to-indigo-pair-500/10 border border-brand-200 rounded-xl p-4">
                                <h4 className="font-black text-brand-900 mb-2 flex items-center gap-2 tracking-tight">
                                    <BarChart3 className="w-4 h-4" aria-hidden="true" />
                                    학습 진도
                                </h4>
                                <div className="space-y-2">
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-brand-700 font-bold">마스터 진행률</span>
                                            <span className="font-black text-brand-900">
                                                {words.length > 0 ? Math.round((stats.mastered / words.length) * 100) : 0}%
                                            </span>
                                        </div>
                                        <div className="w-full bg-brand-200 rounded-pill h-2">
                                            <div
                                                className="bg-brand-600 h-2 rounded-pill transition-all"
                                                style={{ width: `${words.length > 0 ? (stats.mastered / words.length) * 100 : 0}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-success-700 font-bold">학습 중 + 마스터</span>
                                            <span className="font-black text-success-700">
                                                {words.length > 0 ? Math.round(((stats.learning + stats.mastered) / words.length) * 100) : 0}%
                                            </span>
                                        </div>
                                        <div className="w-full bg-success-50 rounded-pill h-2">
                                            <div
                                                className="bg-success-600 h-2 rounded-pill transition-all"
                                                style={{ width: `${words.length > 0 ? ((stats.learning + stats.mastered) / words.length) * 100 : 0}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-brand-50 border border-brand-200 rounded-xl p-4">
                                <p className="text-sm text-brand-800">
                                    <strong>학습 팁:</strong> 꾸준한 복습이 중요합니다. 매일 조금씩 학습하는 것이 한 번에 많이 공부하는 것보다 효과적입니다.
                                </p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'data' && (
                        <div className="space-y-4">
                            <ActionCard tone="brand" icon={Download} title="데이터 내보내기" desc="모든 단어와 학습 데이터를 CSV 파일로 다운로드합니다.">
                                <Button variant="primary" size="md" onClick={handleExportData} leftIcon={Download}>
                                    CSV 파일 다운로드
                                </Button>
                            </ActionCard>

                            <ActionCard tone="warning" icon={Trash2} title="데이터 초기화" desc="모든 단어와 폴더를 삭제합니다. 이 작업은 되돌릴 수 없습니다.">
                                <Button
                                    variant="danger"
                                    size="md"
                                    disabled={isLoading}
                                    onClick={handleResetData}
                                    leftIcon={Trash2}
                                    className="!bg-warning-600 hover:!bg-warning-700"
                                >
                                    모든 데이터 삭제
                                </Button>
                            </ActionCard>
                        </div>
                    )}

                    {activeTab === 'folders' && (
                        <div className="space-y-4">
                            <Button
                                variant="primary"
                                size="lg"
                                fullWidth
                                onClick={() => setShowFolderCreate(!showFolderCreate)}
                                leftIcon={FolderPlus}
                            >
                                새 폴더 만들기
                            </Button>

                            {showFolderCreate && (
                                <div className="bg-surface-50 border border-surface-200 rounded-xl p-4 space-y-3">
                                    <input
                                        type="text"
                                        value={newFolderName}
                                        onChange={(e) => setNewFolderName(e.target.value)}
                                        placeholder="폴더 이름"
                                        className={inputClass}
                                    />
                                    <div>
                                        <p className="text-sm font-bold text-surface-700 mb-2">폴더 색상</p>
                                        <div className="flex gap-2 flex-wrap">
                                            {folderColors.map(color => (
                                                <button
                                                    key={color.value}
                                                    onClick={() => setNewFolderColor(color.value)}
                                                    title={color.name}
                                                    aria-label={`${color.name} 색상`}
                                                    className={`w-8 h-8 rounded-pill border-2 transition-all ${
                                                        newFolderColor === color.value ? 'border-surface-900 scale-110' : 'border-surface-300'
                                                    }`}
                                                    style={{ backgroundColor: color.value }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="primary" size="md" fullWidth disabled={!newFolderName.trim()} onClick={handleCreateFolderSubmit}>
                                            생성
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="md"
                                            onClick={() => {
                                                setShowFolderCreate(false);
                                                setNewFolderName('');
                                                setNewFolderColor('#3B82F6');
                                            }}
                                        >
                                            취소
                                        </Button>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                {folders.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Folder className="w-12 h-12 text-surface-300 mx-auto mb-3" aria-hidden="true" />
                                        <p className="text-surface-500 font-semibold">생성된 폴더가 없습니다.</p>
                                    </div>
                                ) : (
                                    folders.map(folder => (
                                        <div
                                            key={folder.id}
                                            className="border border-surface-200 rounded-md p-4 hover:border-surface-300 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-10 h-10 rounded-md flex items-center justify-center"
                                                    style={{ backgroundColor: folder.color + '20' }}
                                                >
                                                    <Folder className="w-5 h-5" style={{ color: folder.color }} aria-hidden="true" />
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
                                                            className="w-full px-2 py-1 border border-brand-500 rounded focus:outline-none focus:ring-2 focus:ring-brand-500"
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <>
                                                            <h4 className="font-black text-surface-900 tracking-tight">{folder.name}</h4>
                                                            <p className="text-sm text-surface-500">
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
                                                                title="저장"
                                                                aria-label="저장"
                                                                className="p-2 text-success-600 hover:bg-success-50 rounded-md transition-colors"
                                                            >
                                                                <Save className="w-4 h-4" aria-hidden="true" />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setEditingFolderId(null);
                                                                    setEditingFolderName('');
                                                                }}
                                                                title="취소"
                                                                aria-label="취소"
                                                                className="p-2 text-surface-600 hover:bg-surface-100 rounded-md transition-colors"
                                                            >
                                                                <X className="w-4 h-4" aria-hidden="true" />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    setEditingFolderId(folder.id);
                                                                    setEditingFolderName(folder.name);
                                                                }}
                                                                title="이름 변경"
                                                                aria-label="이름 변경"
                                                                className="p-2 text-brand-600 hover:bg-brand-50 rounded-md transition-colors"
                                                            >
                                                                <Edit3 className="w-4 h-4" aria-hidden="true" />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    if (window.confirm(`'${folder.name}' 폴더를 삭제하시겠습니까?\n\n폴더 내 단어들은 미분류로 이동됩니다.`)) {
                                                                        onDeleteFolder(folder.id);
                                                                    }
                                                                }}
                                                                title="삭제"
                                                                aria-label="삭제"
                                                                className="p-2 text-danger-600 hover:bg-danger-50 rounded-md transition-colors"
                                                            >
                                                                <Trash2 className="w-4 h-4" aria-hidden="true" />
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
                            <ActionCard
                                tone="neutral"
                                icon={LogOut}
                                title="로그아웃"
                                desc="현재 세션에서 로그아웃합니다. 데이터는 보존됩니다."
                            >
                                <Button
                                    variant="dark"
                                    size="md"
                                    onClick={() => { onLogout(); onClose(); }}
                                    leftIcon={LogOut}
                                >
                                    로그아웃
                                </Button>
                            </ActionCard>

                            <ActionCard
                                tone="danger"
                                icon={AlertTriangle}
                                title="회원 탈퇴"
                                desc="계정과 모든 데이터를 영구적으로 삭제합니다. 이 작업은 되돌릴 수 없습니다."
                            >
                                {!showDeleteConfirm ? (
                                    <Button variant="danger" size="md" onClick={() => setShowDeleteConfirm(true)} leftIcon={AlertTriangle}>
                                        회원 탈퇴
                                    </Button>
                                ) : (
                                    <div className="space-y-3">
                                        <input
                                            type="password"
                                            value={deletePassword}
                                            onChange={(e) => setDeletePassword(e.target.value)}
                                            placeholder="비밀번호를 입력하세요"
                                            className="w-full px-4 py-2 border border-danger-300 rounded-md focus:outline-none focus:ring-2 focus:ring-danger-500"
                                        />
                                        <div className="flex gap-2">
                                            <Button variant="danger" size="md" fullWidth disabled={isLoading} onClick={handleDeleteAccount}>
                                                확인 - 계정 삭제
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                size="md"
                                                onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); }}
                                            >
                                                취소
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </ActionCard>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AccountSettings;
