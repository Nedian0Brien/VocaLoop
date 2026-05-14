import React, { useEffect, useRef, useState } from 'react';
import { AI_PROVIDERS, DEFAULT_AI_SETTINGS, getDefaultModelForProvider } from '../services/aiModelService';
import { getSettings, updateSettings } from '../services/settingsApi';
import { uploadProfileImage, deleteProfileImage } from '../services/uploadApi';
import { deleteAccount, resetAccountData } from '../services/accountApi';
import { X, User, BarChart3, FileText, Shield, Settings as SettingsIcon, Folder } from './Icons';
import {
  AccountDangerPanel,
  DataSettingsPanel,
  FoldersSettingsPanel,
  ProfileSettingsPanel,
  SettingsTabs,
  StatsSettingsPanel,
} from './accountSettingsPanels';

const normalizeAiSettings = (value = {}) => {
  const provider = AI_PROVIDERS[value?.provider] ? value.provider : DEFAULT_AI_SETTINGS.provider;
  const providerConfig = AI_PROVIDERS[provider] || AI_PROVIDERS.gemini;

  return {
    provider,
    model: providerConfig.models.includes(value?.model) ? value.model : getDefaultModelForProvider(provider),
    geminiApiKey: value?.geminiApiKey || '',
    openaiApiKey: value?.openaiApiKey || '',
    claudeApiKey: value?.claudeApiKey || '',
  };
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

const tabs = [
  { id: 'profile', label: '프로필', icon: User },
  { id: 'stats', label: '통계', icon: BarChart3 },
  { id: 'folders', label: '폴더', icon: Folder },
  { id: 'data', label: '데이터', icon: FileText },
  { id: 'account', label: '계정', icon: Shield },
];

const buildStats = (words) => ({
  totalWords: words.length,
  newWords: words.filter((word) => word.status === 'NEW').length,
  learning: words.filter((word) => word.status === 'LEARNING').length,
  mastered: words.filter((word) => word.status === 'MASTERED').length,
  totalReviews: words.reduce((sum, word) => sum + (word.stats?.review_count || 0), 0),
  avgAccuracy: words.length > 0
    ? Math.round((words.reduce((sum, word) => {
      const total = word.stats?.review_count || 0;
      const wrong = word.stats?.wrong_count || 0;
      return sum + (total > 0 ? ((total - wrong) / total) * 100 : 0);
    }, 0) / words.length))
    : 0,
});

const buildWordCountByFolder = (words) => words.reduce((counts, word) => {
  const folderId = word.folderId || '__uncategorized';
  return { ...counts, [folderId]: (counts[folderId] || 0) + 1 };
}, {});

export default function AccountSettings({
  user,
  words,
  folders,
  onClose,
  onLogout,
  showNotification,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  aiSettings,
  onAiSettingsChange,
  onUserUpdate,
  onDataReset,
  onAccountDeleted,
}) {
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

  useEffect(() => {
    loadUserProfile();
  }, [user]);

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

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
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
      if (event.target) event.target.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    if (!user || !window.confirm('프로필 사진을 제거하시겠습니까?')) return;
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
      const resolved = normalizeAiSettings({ provider: aiProvider, model: aiModel, geminiApiKey, openaiApiKey, claudeApiKey });
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
      onUserUpdate?.({ displayName: updated?.displayName ?? (displayName?.trim() ? displayName.trim() : null) });
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
    setAiModel(getDefaultModelForProvider(provider.id));
  };

  const handleExportData = async () => {
    try {
      const header = 'Word,Korean Meaning,Pronunciation,Part of Speech,Definitions,Examples,Nuance,Synonyms,Status,Wrong Count,Review Count,Folder\n';
      const rows = words.map((word) => {
        const folderName = word.folderId ? folders.find((folder) => folder.id === word.folderId)?.name || '' : '';
        const definitions = word.definitions?.join('; ') || '';
        const examples = word.examples?.map((example) => `${example.en} (${example.ko})`).join('; ') || '';
        const synonyms = word.synonyms?.join(', ') || '';
        return `"${word.word}","${word.meaning_ko || ''}","${word.pronunciation || ''}","${word.pos || ''}","${definitions}","${examples}","${word.nuance || ''}","${synonyms}","${word.status || ''}","${word.stats?.wrong_count || 0}","${word.stats?.review_count || 0}","${folderName}"`;
      });
      const blob = new Blob(['\ufeff' + header + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
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
    if (!window.confirm('모든 단어와 학습 데이터를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.')) return;
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

  const activeAiProvider = AI_PROVIDERS[aiProvider] || AI_PROVIDERS.gemini;
  const activeAiKeyValue = aiProvider === 'openai' ? openaiApiKey : aiProvider === 'claude' ? claudeApiKey : geminiApiKey;
  const stats = buildStats(words);

  return (
    <div className="fixed inset-0 bg-surface-900/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-card shadow-[var(--shadow-floating)] max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-brand-600 to-indigo-pair-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SettingsIcon className="w-6 h-6 text-white" aria-hidden="true" />
            <h2 className="text-xl font-black text-white tracking-tight">계정 설정</h2>
          </div>
          <button type="button" onClick={onClose} className="text-white hover:bg-white/20 rounded-md p-2 transition-colors" aria-label="설정 닫기">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <SettingsTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'profile' && (
            <ProfileSettingsPanel
              user={user}
              fileInputRef={fileInputRef}
              isLoading={isLoading}
              profilePhotoURL={profilePhotoURL}
              displayName={displayName}
              setDisplayName={setDisplayName}
              toeflTarget={toeflTarget}
              setToeflTarget={setToeflTarget}
              aiProvider={aiProvider}
              aiModel={aiModel}
              setAiModel={setAiModel}
              geminiApiKey={geminiApiKey}
              setGeminiApiKey={setGeminiApiKey}
              openaiApiKey={openaiApiKey}
              setOpenaiApiKey={setOpenaiApiKey}
              claudeApiKey={claudeApiKey}
              setClaudeApiKey={setClaudeApiKey}
              activeAiProvider={activeAiProvider}
              isActiveAiKeyMissing={!activeAiKeyValue.trim()}
              onAiProviderChange={handleAiProviderChange}
              onPhotoUpload={handlePhotoUpload}
              onRemovePhoto={handleRemovePhoto}
              onSaveProfile={handleSaveProfile}
            />
          )}

          {activeTab === 'stats' && <StatsSettingsPanel stats={stats} words={words} toeflTarget={toeflTarget} />}

          {activeTab === 'folders' && (
            <FoldersSettingsPanel
              folders={folders}
              folderColors={folderColors}
              wordCountByFolder={buildWordCountByFolder(words)}
              showFolderCreate={showFolderCreate}
              setShowFolderCreate={setShowFolderCreate}
              newFolderName={newFolderName}
              setNewFolderName={setNewFolderName}
              newFolderColor={newFolderColor}
              setNewFolderColor={setNewFolderColor}
              editingFolderId={editingFolderId}
              setEditingFolderId={setEditingFolderId}
              editingFolderName={editingFolderName}
              setEditingFolderName={setEditingFolderName}
              onCreateFolderSubmit={handleCreateFolderSubmit}
              onRename={handleRename}
              onDeleteFolder={onDeleteFolder}
            />
          )}

          {activeTab === 'data' && (
            <DataSettingsPanel isLoading={isLoading} onExportData={handleExportData} onResetData={handleResetData} />
          )}

          {activeTab === 'account' && (
            <AccountDangerPanel
              isLoading={isLoading}
              showDeleteConfirm={showDeleteConfirm}
              setShowDeleteConfirm={setShowDeleteConfirm}
              deletePassword={deletePassword}
              setDeletePassword={setDeletePassword}
              onLogout={onLogout}
              onClose={onClose}
              onDeleteAccount={handleDeleteAccount}
            />
          )}
        </div>
      </div>
    </div>
  );
}
