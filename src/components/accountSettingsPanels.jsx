import React from 'react';
import { AI_PROVIDERS } from '../services/aiModelService';
import { Button, Stat } from '../design-system';
import ProviderLogo from './ProviderLogos';
import {
  AlertTriangle,
  BarChart3,
  Camera,
  Download,
  Edit3,
  FileText,
  Folder,
  FolderPlus,
  LogOut,
  Save,
  Target,
  Trash2,
  X,
} from './Icons';

const labelClass = 'block text-sm font-bold text-surface-700 mb-2';
const inputClass = 'w-full px-4 py-2 border border-surface-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500';
const providerDisplay = {
  gemini: { label: 'Gemini', caption: 'Google AI' },
  openai: { label: 'Codex', caption: 'OpenAI' },
  claude: { label: 'Claude', caption: 'Anthropic' },
};

export const ActionCard = ({ tone = 'neutral', icon: Icon, title, desc, children }) => {
  const tones = {
    neutral: { card: 'border-surface-200 hover:border-surface-300', iconWrap: 'bg-surface-100 text-surface-600', title: 'text-surface-900', desc: 'text-surface-600' },
    brand: { card: 'border-surface-200 hover:border-brand-300', iconWrap: 'bg-brand-100 text-brand-600', title: 'text-surface-900', desc: 'text-surface-600' },
    warning: { card: 'border-warning-200 hover:border-warning-300 bg-warning-50', iconWrap: 'bg-warning-100 text-warning-600', title: 'text-surface-900', desc: 'text-surface-600' },
    danger: { card: 'border-danger-200 hover:border-danger-300 bg-danger-50', iconWrap: 'bg-danger-100 text-danger-600', title: 'text-danger-900', desc: 'text-danger-700' },
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

export function SettingsTabs({ tabs, activeTab, onTabChange }) {
  return (
    <div className="border-b border-surface-200 bg-surface-50 px-2 sm:px-6">
      <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label="계정 설정 섹션">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(tab.id)}
              className={`flex shrink-0 items-center gap-2 px-4 py-3 font-bold transition-all ${
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
  );
}

export function ProfileSettingsPanel({
  user,
  fileInputRef,
  isLoading,
  profilePhotoURL,
  displayName,
  setDisplayName,
  toeflTarget,
  setToeflTarget,
  aiProvider,
  aiModel,
  setAiModel,
  geminiApiKey,
  setGeminiApiKey,
  openaiApiKey,
  setOpenaiApiKey,
  claudeApiKey,
  setClaudeApiKey,
  activeAiProvider,
  isActiveAiKeyMissing,
  onAiProviderChange,
  onPhotoUpload,
  onRemovePhoto,
  onSaveProfile,
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-4 pb-6 border-b border-surface-200">
        <div className="relative group">
          {profilePhotoURL ? (
            <img src={profilePhotoURL} alt="Profile" className="w-24 h-24 rounded-pill border-4 border-surface-200 object-cover" />
          ) : (
            <div className="w-24 h-24 rounded-pill bg-gradient-to-br from-brand-500 to-indigo-pair-600 flex items-center justify-center text-white text-3xl font-black border-4 border-surface-200">
              {displayName?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            aria-label="프로필 사진 변경"
            className="absolute bottom-0 right-0 bg-brand-600 text-white p-2 rounded-pill shadow-[var(--shadow-elevated)] hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            <Camera className="w-4 h-4" aria-hidden="true" />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" aria-label="프로필 사진 파일" onChange={onPhotoUpload} className="hidden" />
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-surface-500">프로필 사진</p>
          <p className="text-xs text-surface-400 mt-1">클릭하여 변경 (최대 5MB)</p>
          {profilePhotoURL && (
            <button type="button" onClick={onRemovePhoto} disabled={isLoading} className="text-xs font-bold text-danger-600 hover:text-danger-700 mt-2 disabled:opacity-50">
              사진 제거
            </button>
          )}
        </div>
      </div>

      <div>
        <label className={labelClass}>이름</label>
        <input type="text" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="이름을 입력하세요" className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>이메일</label>
        <input type="email" value={user?.email || ''} disabled className="w-full px-4 py-2 border border-surface-200 rounded-md bg-surface-50 text-surface-500" />
        {user?.metadata?.creationTime && (
          <p className="text-xs text-surface-500 mt-1">가입일: {new Date(user.metadata.creationTime).toLocaleDateString('ko-KR')}</p>
        )}
      </div>

      <div>
        <label className={labelClass}>TOEFL 목표 점수</label>
        <input type="number" value={toeflTarget} onChange={(event) => setToeflTarget(event.target.value)} placeholder="예: 100" min="0" max="120" className={inputClass} />
        <p className="text-xs text-surface-500 mt-1">TOEFL iBT 총점 (0-120)</p>
      </div>

      <div className="space-y-4 border border-surface-200 rounded-xl p-4">
        <div>
          <label className={labelClass}>AI Provider</label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="AI Provider">
            {Object.values(AI_PROVIDERS).map((provider) => {
              const display = providerDisplay[provider.id] || { label: provider.label, caption: provider.name };

              return (
                <button
                  key={provider.id}
                  type="button"
                  role="radio"
                  aria-label={`${display.label} ${display.caption}`}
                  aria-checked={aiProvider === provider.id}
                  onClick={() => onAiProviderChange(provider.id)}
                  className={[
                    'flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
                    aiProvider === provider.id
                      ? 'border-brand-300 bg-brand-50 text-brand-900'
                      : 'border-surface-200 bg-white text-surface-700 hover:border-surface-300 hover:bg-surface-50',
                  ].join(' ')}
                >
                  <ProviderLogo provider={provider.id} className="h-7 w-7 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-sm font-black leading-tight">
                      {display.label}
                    </span>
                    <span className="mt-0.5 block text-xs font-bold text-surface-500">
                      {display.caption}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className={labelClass}>모델</label>
          <select value={aiModel} onChange={(event) => setAiModel(event.target.value)} className={inputClass}>
            {activeAiProvider.models.map((model) => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {[
          { key: 'gemini', label: 'Google AI API Key', value: geminiApiKey, setter: setGeminiApiKey, placeholder: 'Google AI Studio에서 발급받은 키 입력', linkText: 'Google AI Studio' },
          { key: 'openai', label: 'OpenAI API Key', value: openaiApiKey, setter: setOpenaiApiKey, placeholder: 'OpenAI API Keys에서 발급받은 키 입력', linkText: 'OpenAI API Keys' },
          { key: 'claude', label: 'Claude API Key', value: claudeApiKey, setter: setClaudeApiKey, placeholder: 'Anthropic Console에서 발급받은 키 입력', linkText: 'Anthropic Console' },
        ].map(({ key, label, value, setter, placeholder, linkText }) => (
          <div key={key}>
            <label className={labelClass}>{label}</label>
            <input
              type="password"
              value={value}
              onChange={(event) => setter(event.target.value)}
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
        <p className="text-xs text-danger-500 font-bold">현재 선택한 모델({activeAiProvider.name})을 사용하려면 해당 API Key를 입력해야 합니다.</p>
      )}

      <Button variant="primary" size="lg" fullWidth disabled={isLoading} onClick={onSaveProfile} leftIcon={Save}>
        프로필 저장
      </Button>
    </div>
  );
}

export function StatsSettingsPanel({ stats, words, toeflTarget }) {
  const masteryPercent = words.length > 0 ? Math.round((stats.mastered / words.length) * 100) : 0;
  const activePercent = words.length > 0 ? Math.round(((stats.learning + stats.mastered) / words.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Stat title="총 단어 수" value={stats.totalWords} icon={BarChart3} tone="brand" />
        <Stat title="마스터한 단어" value={stats.mastered} icon={Target} tone="success" />
        <Stat title="학습 중" value={stats.learning} icon={Edit3} tone="warning" />
        <Stat title="새 단어" value={stats.newWords} icon={FileText} tone="accent" />
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
          <ProgressBar label="마스터 진행률" value={masteryPercent} tone="brand" />
          <ProgressBar label="학습 중 + 마스터" value={activePercent} tone="success" />
        </div>
      </div>

      <div className="bg-brand-50 border border-brand-200 rounded-xl p-4">
        <p className="text-sm text-brand-800">
          <strong>학습 팁:</strong> 꾸준한 복습이 중요합니다. 매일 조금씩 학습하는 것이 한 번에 많이 공부하는 것보다 효과적입니다.
        </p>
      </div>
    </div>
  );
}

function ProgressBar({ label, value, tone }) {
  const toneClasses = tone === 'success'
    ? { text: 'text-success-700', track: 'bg-success-50', bar: 'bg-success-600' }
    : { text: 'text-brand-700', track: 'bg-brand-200', bar: 'bg-brand-600' };

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className={`${toneClasses.text} font-bold`}>{label}</span>
        <span className={`font-black ${toneClasses.text}`}>{value}%</span>
      </div>
      <div className={`w-full ${toneClasses.track} rounded-pill h-2`}>
        <div className={`${toneClasses.bar} h-2 rounded-pill transition-all`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function DataSettingsPanel({ isLoading, onExportData, onResetData }) {
  return (
    <div className="space-y-4">
      <ActionCard tone="brand" icon={Download} title="데이터 내보내기" desc="모든 단어와 학습 데이터를 CSV 파일로 다운로드합니다.">
        <Button variant="primary" size="md" onClick={onExportData} leftIcon={Download}>
          CSV 파일 다운로드
        </Button>
      </ActionCard>

      <ActionCard tone="warning" icon={Trash2} title="데이터 초기화" desc="모든 단어와 폴더를 삭제합니다. 이 작업은 되돌릴 수 없습니다.">
        <Button variant="danger" size="md" disabled={isLoading} onClick={onResetData} leftIcon={Trash2} className="!bg-warning-600 hover:!bg-warning-700">
          모든 데이터 삭제
        </Button>
      </ActionCard>
    </div>
  );
}

export function FoldersSettingsPanel({
  folders,
  folderColors,
  wordCountByFolder,
  showFolderCreate,
  setShowFolderCreate,
  newFolderName,
  setNewFolderName,
  newFolderColor,
  setNewFolderColor,
  editingFolderId,
  setEditingFolderId,
  editingFolderName,
  setEditingFolderName,
  onCreateFolderSubmit,
  onRename,
  onDeleteFolder,
}) {
  const resetCreateForm = () => {
    setShowFolderCreate(false);
    setNewFolderName('');
    setNewFolderColor('#3B82F6');
  };

  return (
    <div className="space-y-4">
      <Button variant="primary" size="lg" fullWidth onClick={() => setShowFolderCreate(!showFolderCreate)} leftIcon={FolderPlus}>
        새 폴더 만들기
      </Button>

      {showFolderCreate && (
        <div className="bg-surface-50 border border-surface-200 rounded-xl p-4 space-y-3">
          <input type="text" value={newFolderName} onChange={(event) => setNewFolderName(event.target.value)} placeholder="폴더 이름" className={inputClass} />
          <div>
            <p className="text-sm font-bold text-surface-700 mb-2">폴더 색상</p>
            <div className="flex gap-2 flex-wrap">
              {folderColors.map((color) => (
                <button
                  key={color.value}
                  type="button"
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
            <Button variant="primary" size="md" fullWidth disabled={!newFolderName.trim()} onClick={onCreateFolderSubmit}>
              생성
            </Button>
            <Button variant="secondary" size="md" onClick={resetCreateForm}>
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
          folders.map((folder) => (
            <FolderRow
              key={folder.id}
              folder={folder}
              wordCount={wordCountByFolder[folder.id] || 0}
              editingFolderId={editingFolderId}
              editingFolderName={editingFolderName}
              setEditingFolderId={setEditingFolderId}
              setEditingFolderName={setEditingFolderName}
              onRename={onRename}
              onDeleteFolder={onDeleteFolder}
            />
          ))
        )}
      </div>
    </div>
  );
}

function FolderRow({
  folder,
  wordCount,
  editingFolderId,
  editingFolderName,
  setEditingFolderId,
  setEditingFolderName,
  onRename,
  onDeleteFolder,
}) {
  const isEditing = editingFolderId === folder.id;

  return (
    <div className="border border-surface-200 rounded-md p-4 hover:border-surface-300 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-md flex items-center justify-center" style={{ backgroundColor: `${folder.color}20` }}>
          <Folder className="w-5 h-5" style={{ color: folder.color }} aria-hidden="true" />
        </div>
        <div className="flex-1">
          {isEditing ? (
            <input
              type="text"
              value={editingFolderName}
              onChange={(event) => setEditingFolderName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') onRename(folder.id);
                if (event.key === 'Escape') {
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
              <p className="text-sm text-surface-500">{wordCount}개의 단어</p>
            </>
          )}
        </div>
        <div className="flex gap-1">
          {isEditing ? (
            <>
              <IconButton label="저장" tone="success" icon={Save} onClick={() => onRename(folder.id)} />
              <IconButton
                label="취소"
                tone="neutral"
                icon={X}
                onClick={() => {
                  setEditingFolderId(null);
                  setEditingFolderName('');
                }}
              />
            </>
          ) : (
            <>
              <IconButton
                label="이름 변경"
                tone="brand"
                icon={Edit3}
                onClick={() => {
                  setEditingFolderId(folder.id);
                  setEditingFolderName(folder.name);
                }}
              />
              <IconButton
                label="삭제"
                tone="danger"
                icon={Trash2}
                onClick={() => {
                  if (window.confirm(`'${folder.name}' 폴더를 삭제하시겠습니까?\n\n폴더 내 단어들은 미분류로 이동됩니다.`)) {
                    onDeleteFolder(folder.id);
                  }
                }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function IconButton({ label, tone, icon: Icon, onClick }) {
  const toneClass = {
    brand: 'text-brand-600 hover:bg-brand-50',
    danger: 'text-danger-600 hover:bg-danger-50',
    neutral: 'text-surface-600 hover:bg-surface-100',
    success: 'text-success-600 hover:bg-success-50',
  }[tone];

  return (
    <button type="button" onClick={onClick} title={label} aria-label={label} className={`p-2 rounded-md transition-colors ${toneClass}`}>
      <Icon className="w-4 h-4" aria-hidden="true" />
    </button>
  );
}

export function AccountDangerPanel({
  isLoading,
  showDeleteConfirm,
  setShowDeleteConfirm,
  deletePassword,
  setDeletePassword,
  onLogout,
  onClose,
  onDeleteAccount,
}) {
  return (
    <div className="space-y-4">
      <ActionCard tone="neutral" icon={LogOut} title="로그아웃" desc="현재 세션에서 로그아웃합니다. 데이터는 보존됩니다.">
        <Button variant="dark" size="md" onClick={() => { onLogout(); onClose?.(); }} leftIcon={LogOut}>
          로그아웃
        </Button>
      </ActionCard>

      <ActionCard tone="danger" icon={AlertTriangle} title="회원 탈퇴" desc="계정과 모든 데이터를 영구적으로 삭제합니다. 이 작업은 되돌릴 수 없습니다.">
        {!showDeleteConfirm ? (
          <Button variant="danger" size="md" onClick={() => setShowDeleteConfirm(true)} leftIcon={AlertTriangle}>
            회원 탈퇴
          </Button>
        ) : (
          <div className="space-y-3">
            <input
              type="password"
              value={deletePassword}
              onChange={(event) => setDeletePassword(event.target.value)}
              placeholder="비밀번호를 입력하세요"
              className="w-full px-4 py-2 border border-danger-300 rounded-md focus:outline-none focus:ring-2 focus:ring-danger-500"
            />
            <div className="flex gap-2">
              <Button variant="danger" size="md" fullWidth disabled={isLoading} onClick={onDeleteAccount}>
                확인 - 계정 삭제
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletePassword('');
                }}
              >
                취소
              </Button>
            </div>
          </div>
        )}
      </ActionCard>
    </div>
  );
}
