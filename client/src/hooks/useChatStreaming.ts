import { useState, useRef, useEffect, useCallback } from 'react';
import { devLog } from '@/lib/devLog';

export interface StreamingState {
  isStreaming: boolean;
  streamingContent: string;
  streamingAgent: string | null;
  streamingConversationId: string | null;
  isThinking: boolean;
  thinkingPhrase: string;
}

export interface StreamingActions {
  setIsStreaming: React.Dispatch<React.SetStateAction<boolean>>;
  setStreamingContent: React.Dispatch<React.SetStateAction<string>>;
  setStreamingAgent: React.Dispatch<React.SetStateAction<string | null>>;
  setStreamingConversationId: React.Dispatch<React.SetStateAction<string | null>>;
  setIsThinking: React.Dispatch<React.SetStateAction<boolean>>;
  streamingMessageId: React.MutableRefObject<string | null>;
  clearStreamingTimeout: () => void;
  resetStreamingTimeout: () => void;
  clearPendingResponseTimeout: () => void;
  resetPendingResponseTimeout: (conversationId: string, tempMessageId: string) => void;
  clearAllStreamingState: () => void;
  flashIntervalRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>;
  startFlashingTitle: (count: number, label: string) => void;
  stopFlashingTitle: () => void;
  requestNotificationPermission: () => void;
  fireCompletionNotification: (projectName: string, summary: string) => void;
}

interface UseChatStreamingOptions {
  /** Called when the streaming watchdog times out, to update the failed message */
  onStreamingTimeout?: (conversationId: string, messageId: string) => void;
  /** Called when pending response times out */
  onPendingResponseTimeout?: (conversationId: string, messageId: string) => void;
  /** Returns the current conversation ID */
  getCurrentConversationId: () => string | undefined;
}

export function useChatStreaming(options: UseChatStreamingOptions): StreamingState & StreamingActions {
  const { onStreamingTimeout, onPendingResponseTimeout, getCurrentConversationId } = options;

  // B1: Streaming state management
  const [isStreaming, setIsStreaming] = useState(false);
  const streamingMessageId = useRef<string | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingAgent, setStreamingAgent] = useState<string | null>(null);
  const [streamingConversationId, setStreamingConversationId] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);

  // Task 10: Cycling thinking state text
  const thinkingPhrases = ['Thinking...', 'Reviewing context...', 'Forming a response...'];
  const [thinkingPhraseIdx, setThinkingPhraseIdx] = useState(0);
  const thinkingPhraseTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isThinking) {
      setThinkingPhraseIdx(0);
      thinkingPhraseTimerRef.current = setInterval(() => {
        setThinkingPhraseIdx((prev) => (prev + 1) % thinkingPhrases.length);
      }, 1800);
    } else {
      if (thinkingPhraseTimerRef.current) clearInterval(thinkingPhraseTimerRef.current);
    }
    return () => { if (thinkingPhraseTimerRef.current) clearInterval(thinkingPhraseTimerRef.current); };
  }, [isThinking]);

  const streamingTimeoutRef = useRef<number | null>(null);
  const pendingResponseTimeoutRef = useRef<number | null>(null);

  // UX-05: Flash interval ref for tab title flashing
  const flashIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearStreamingTimeout = useCallback(() => {
    if (streamingTimeoutRef.current) {
      clearTimeout(streamingTimeoutRef.current);
      streamingTimeoutRef.current = null;
    }
  }, []);

  const resetStreamingTimeout = useCallback(() => {
    clearStreamingTimeout();
    streamingTimeoutRef.current = window.setTimeout(() => {
      devLog('Streaming watchdog timeout - clearing streaming state');
      const convId = getCurrentConversationId();
      const msgId = streamingMessageId.current;
      if (convId && msgId && onStreamingTimeout) {
        onStreamingTimeout(convId, msgId);
      }
      setIsStreaming(false);
      streamingMessageId.current = null;
      setStreamingContent('');
      setStreamingAgent(null);
      setStreamingConversationId(null);
    }, 45000); // 45s watchdog
  }, [clearStreamingTimeout, getCurrentConversationId, onStreamingTimeout]);

  const clearPendingResponseTimeout = useCallback(() => {
    if (pendingResponseTimeoutRef.current) {
      clearTimeout(pendingResponseTimeoutRef.current);
      pendingResponseTimeoutRef.current = null;
    }
  }, []);

  const resetPendingResponseTimeout = useCallback((conversationId: string, tempMessageId: string) => {
    clearPendingResponseTimeout();
    pendingResponseTimeoutRef.current = window.setTimeout(() => {
      devLog('Pending response timeout - no streaming start received');
      if (onPendingResponseTimeout) {
        onPendingResponseTimeout(conversationId, tempMessageId);
      }
      setIsThinking(false);
      setIsStreaming(false);
      setStreamingAgent(null);
      setStreamingContent('');
      setStreamingConversationId(null);
      streamingMessageId.current = null;
    }, 15000);
  }, [clearPendingResponseTimeout, onPendingResponseTimeout]);

  const clearAllStreamingState = useCallback(() => {
    setIsStreaming(false);
    setIsThinking(false);
    streamingMessageId.current = null;
    setStreamingContent('');
    setStreamingAgent(null);
    setStreamingConversationId(null);
    clearStreamingTimeout();
    clearPendingResponseTimeout();
  }, [clearStreamingTimeout, clearPendingResponseTimeout]);

  // UX-05: Flashing tab title utility functions
  const startFlashingTitle = useCallback((count: number, label: string) => {
    if (flashIntervalRef.current) clearInterval(flashIntervalRef.current);
    const notifText = `(${count}) ${label} | Hatchin`;
    let toggle = true;
    flashIntervalRef.current = setInterval(() => {
      document.title = toggle ? notifText : 'Hatchin';
      toggle = !toggle;
    }, 1500);
  }, []);

  const stopFlashingTitle = useCallback(() => {
    if (flashIntervalRef.current) {
      clearInterval(flashIntervalRef.current);
      flashIntervalRef.current = null;
    }
    document.title = 'Hatchin';
  }, []);

  // UX-05: Notification API helpers
  const requestNotificationPermission = useCallback(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const fireCompletionNotification = useCallback((projectName: string, summary: string) => {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    try {
      const n = new Notification(projectName, {
        body: summary,
        icon: '/favicon.ico',
      });
      n.onclick = () => {
        window.focus();
        n.close();
      };
    } catch {
      // Non-critical
    }
  }, []);

  // UX-05: Reset tab title when user returns
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        stopFlashingTitle();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (flashIntervalRef.current) {
        clearInterval(flashIntervalRef.current);
        flashIntervalRef.current = null;
      }
    };
  }, [stopFlashingTitle]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearPendingResponseTimeout();
      clearStreamingTimeout();
    };
  }, [clearPendingResponseTimeout, clearStreamingTimeout]);

  return {
    // State
    isStreaming,
    streamingContent,
    streamingAgent,
    streamingConversationId,
    isThinking,
    thinkingPhrase: thinkingPhrases[thinkingPhraseIdx],
    // Actions
    setIsStreaming,
    setStreamingContent,
    setStreamingAgent,
    setStreamingConversationId,
    setIsThinking,
    streamingMessageId,
    clearStreamingTimeout,
    resetStreamingTimeout,
    clearPendingResponseTimeout,
    resetPendingResponseTimeout,
    clearAllStreamingState,
    flashIntervalRef,
    startFlashingTitle,
    stopFlashingTitle,
    requestNotificationPermission,
    fireCompletionNotification,
  };
}
