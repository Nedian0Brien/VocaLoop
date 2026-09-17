import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createConversation,
  deleteConversation,
  listConversations,
  listMessages,
  recordImportResult,
  renameConversation,
  sendMessage,
} from '../services/aiAssistantApi';
import { summarizeBulkAddResult } from '../services/aiImportBatches';
import { parseServerDate } from '../utils/serverDate';

export const AI_POLL_INTERVAL_MS = 2000;

const hasPendingMessage = (messages) => messages.some((message) => message.status === 'pending');

const sortConversations = (items) =>
  [...items].sort((a, b) => {
    const byUpdated = parseServerDate(b.updated_at) - parseServerDate(a.updated_at);
    return byUpdated !== 0 ? byUpdated : b.id - a.id;
  });

/**
 * AI 탭 상태. 대화 목록·선택·메시지·폴링·전송과, 파일 가져오기 카드의 저장 오케스트레이션.
 *
 * 새 대화는 서버에 미리 만들지 않는다 — 첫 메시지를 보낼 때 만든다. 빈 대화가 쌓이지 않게.
 * 폴링은 `pending` 메시지가 있을 때만 돈다.
 */
export function useAiAssistant({ onBulkAddWords, onCreateFolder, showNotification, pollIntervalMs = AI_POLL_INTERVAL_MS }) {
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [savingMessageId, setSavingMessageId] = useState(null);
  const [error, setError] = useState('');
  const activeIdRef = useRef(null);
  activeIdRef.current = activeConversationId;
  // send() 가 방금 만든 대화. 메시지는 이미 손에 있으니 다시 불러오지 않는다.
  const freshConversationIdRef = useRef(null);

  const upsertConversation = useCallback((conversation) => {
    setConversations((prev) =>
      sortConversations([...prev.filter((item) => item.id !== conversation.id), conversation])
    );
  }, []);

  const replaceMessage = useCallback((message) => {
    setMessages((prev) => prev.map((item) => (item.id === message.id ? message : item)));
  }, []);

  // --- 대화 목록 ---------------------------------------------------------------

  useEffect(() => {
    let isCurrent = true;
    setIsLoadingConversations(true);
    listConversations()
      .then((items) => {
        if (!isCurrent) return;
        const sorted = sortConversations(items || []);
        setConversations(sorted);
        setActiveConversationId((current) => current ?? sorted[0]?.id ?? null);
      })
      .catch((loadError) => {
        console.error('AI conversations load failed:', loadError);
        if (isCurrent) setError('대화 목록을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (isCurrent) setIsLoadingConversations(false);
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  // --- 메시지 로드 + 폴링 ---------------------------------------------------------

  useEffect(() => {
    if (activeConversationId === null) {
      setMessages([]);
      return undefined;
    }
    if (freshConversationIdRef.current === activeConversationId) {
      freshConversationIdRef.current = null;
      return undefined;
    }

    let isCurrent = true;
    setIsLoadingMessages(true);
    setMessages([]);
    listMessages(activeConversationId)
      .then((items) => {
        if (isCurrent) setMessages(items || []);
      })
      .catch((loadError) => {
        console.error('AI messages load failed:', loadError);
        if (isCurrent) setError('대화를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (isCurrent) setIsLoadingMessages(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [activeConversationId]);

  const isPolling = hasPendingMessage(messages);
  useEffect(() => {
    if (!isPolling || activeConversationId === null) return undefined;
    const conversationId = activeConversationId;
    let isCurrent = true;
    const timer = setInterval(() => {
      listMessages(conversationId)
        .then((items) => {
          if (!isCurrent || activeIdRef.current !== conversationId) return;
          setMessages(items || []);
        })
        .catch((pollError) => console.warn('AI messages poll failed:', pollError));
    }, pollIntervalMs);
    return () => {
      isCurrent = false;
      clearInterval(timer);
    };
  }, [activeConversationId, isPolling, pollIntervalMs]);

  // --- 대화 조작 --------------------------------------------------------------------

  const selectConversation = useCallback((conversationId) => {
    setError('');
    setActiveConversationId(conversationId);
  }, []);

  const startNewConversation = useCallback(() => {
    setError('');
    setActiveConversationId(null);
  }, []);

  const rename = useCallback(async (conversationId, title) => {
    const trimmed = String(title || '').trim();
    if (!trimmed) return false;
    try {
      const updated = await renameConversation(conversationId, trimmed);
      upsertConversation(updated);
      return true;
    } catch (renameError) {
      console.error('AI conversation rename failed:', renameError);
      showNotification?.('대화 이름을 바꾸지 못했습니다.', 'error');
      return false;
    }
  }, [showNotification, upsertConversation]);

  const remove = useCallback(async (conversationId) => {
    try {
      await deleteConversation(conversationId);
    } catch (deleteError) {
      console.error('AI conversation delete failed:', deleteError);
      showNotification?.('대화를 삭제하지 못했습니다.', 'error');
      return false;
    }
    setConversations((prev) => {
      const next = prev.filter((item) => item.id !== conversationId);
      if (activeIdRef.current === conversationId) {
        setActiveConversationId(next[0]?.id ?? null);
      }
      return next;
    });
    return true;
  }, [showNotification]);

  // --- 전송 -----------------------------------------------------------------------

  const send = useCallback(async ({ content = '', file = null } = {}) => {
    const trimmed = String(content || '').trim();
    if (!trimmed && !file) return false;

    setIsSending(true);
    setError('');
    try {
      let conversationId = activeIdRef.current;
      if (conversationId === null) {
        const created = await createConversation();
        conversationId = created.id;
        upsertConversation(created);
        freshConversationIdRef.current = conversationId;
        setActiveConversationId(conversationId);
      }
      const response = await sendMessage(conversationId, { content: trimmed, file });
      upsertConversation(response.conversation);
      setMessages((prev) => [...prev, ...(response.messages || [])]);
      return true;
    } catch (sendError) {
      console.error('AI message send failed:', sendError);
      setError(sendError?.message || '메시지를 보내지 못했습니다.');
      return false;
    } finally {
      setIsSending(false);
    }
  }, [upsertConversation]);

  // --- 파일 가져오기 카드 저장·취소 ------------------------------------------------------

  /**
   * 배치 하나를 저장한다. 새 폴더면 먼저 만들고, 기존 bulk-add 경로로 단어를 넣은 뒤
   * 결과를 서버에 기록한다. 전부 실패하면 기록하지 않고 카드를 남겨 다시 시도할 수 있게 한다.
   */
  const saveImportBatch = useCallback(async ({ message, batchIndex, entries, folderId = null, newFolderName = '' }) => {
    if (!message || savingMessageId !== null) return false;
    const conversationId = message.conversation_id;

    setSavingMessageId(message.id);
    setError('');
    try {
      let targetFolderId = folderId;
      let targetFolderName = null;
      if (newFolderName) {
        const created = await onCreateFolder(newFolderName, 'blue', null);
        if (!created) throw new Error('폴더를 만들지 못했습니다.');
        targetFolderId = created.id;
        targetFolderName = created.name;
      }

      const result = await onBulkAddWords({ words: entries, folderId: targetFolderId });
      const summary = summarizeBulkAddResult(result);
      const updated = await recordImportResult(conversationId, message.id, {
        batch_index: batchIndex,
        status: 'saved',
        folder_id: targetFolderId,
        folder_name: targetFolderName,
        summary,
      });
      replaceMessage(updated);
      return true;
    } catch (saveError) {
      console.error('AI import batch save failed:', saveError);
      setError(saveError?.message || '단어를 저장하지 못했습니다.');
      return false;
    } finally {
      setSavingMessageId(null);
    }
  }, [onBulkAddWords, onCreateFolder, replaceMessage, savingMessageId]);

  const cancelImport = useCallback(async ({ message, batchIndex }) => {
    if (!message) return false;
    try {
      const updated = await recordImportResult(message.conversation_id, message.id, {
        batch_index: batchIndex,
        status: 'cancelled',
      });
      replaceMessage(updated);
      return true;
    } catch (cancelError) {
      console.error('AI import cancel failed:', cancelError);
      setError(cancelError?.message || '취소를 기록하지 못했습니다.');
      return false;
    }
  }, [replaceMessage]);

  const activeConversation = conversations.find((item) => item.id === activeConversationId) || null;

  return {
    activeConversation,
    activeConversationId,
    cancelImport,
    conversations,
    error,
    isLoadingConversations,
    isLoadingMessages,
    isPolling,
    isSending,
    messages,
    remove,
    rename,
    saveImportBatch,
    savingMessageId,
    selectConversation,
    send,
    setError,
    startNewConversation,
  };
}
