import { useEffect, useState } from 'react';
import {
  getCurrentUser as getCurrentUserApi,
  login as loginApi,
  logout as logoutApi,
  signup as signupApi,
} from '../services/authApi';
import { listWords } from '../services/wordApi';
import { listFolders } from '../services/folderApi';
import { getSettings } from '../services/settingsApi';
import {
  normalizeAiSettings,
  normalizeFolder,
  normalizeSessionUser,
  normalizeWord,
  sortFoldersForDisplay,
  sortWordsByNewest,
} from '../utils/appDataTransforms';
import { AI_PROVIDERS } from '../services/aiModelService';

export function useAppSessionData({
  defaultAiSettings,
  onSessionCleared,
  showNotification,
}) {
  const [user, setUser] = useState(null);
  const [words, setWords] = useState([]);
  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [accountAiSettings, setAccountAiSettings] = useState(defaultAiSettings);
  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);

  const clearSessionState = () => {
    setUser(null);
    setWords([]);
    setFolders([]);
    setSelectedFolderId(null);
    setAccountAiSettings(defaultAiSettings);
    onSessionCleared?.();
  };

  const handleUserUpdate = (partial) => {
    if (!partial) return;
    setUser((prev) => (prev ? { ...prev, ...partial } : prev));
  };

  const handleDataReset = () => {
    setWords([]);
    setFolders([]);
    setSelectedFolderId(null);
  };

  const loadSessionData = async () => {
    const [settings, fetchedWords, fetchedFolders] = await Promise.all([
      getSettings(),
      listWords(),
      listFolders(),
    ]);

    setAccountAiSettings(normalizeAiSettings(settings, AI_PROVIDERS, defaultAiSettings));
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
    // The bootstrap flow intentionally runs once on app mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  return {
    accountAiSettings,
    clearSessionState,
    folders,
    handleDataReset,
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
  };
}
