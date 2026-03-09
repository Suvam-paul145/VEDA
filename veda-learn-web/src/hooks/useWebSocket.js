import { useEffect, useRef, useCallback, useState } from 'react';
import useVedaStore from '../store/useVedaStore';

const WS_URL = import.meta.env.VITE_WS_URL; // wss://imhoyvukwe.execute-api.us-east-1.amazonaws.com/dev
const PING_INTERVAL = 25_000; // 25s — keep-alive below 29s API Gateway timeout
const MAX_RETRIES = 5;
const BASE_BACKOFF = 1_000; // 1s · doubles each retry → max ~16s

export function useWebSocket() {
  const wsRef = useRef(null);
  const pingRef = useRef(null);
  const retryRef = useRef(0);
  const retryTimerRef = useRef(null);
  const mountedRef = useRef(true);

  const [status, setStatus] = useState('disconnected'); // disconnected | connecting | connected | error

  // Zustand actions — pulled outside to avoid stale closures
  const setCurrentLesson = useVedaStore(s => s.setCurrentLesson);
  const setCurrentQuiz = useVedaStore(s => s.setCurrentQuiz);
  const updateProgress = useVedaStore(s => s.updateProgress);
  const addNotification = useVedaStore(s => s.addNotification);
  const setWsStatus = useVedaStore(s => s.setWsStatus);

  /** Route incoming WS message to the correct store action */
  const handleMessage = useCallback((raw) => {
    let msg;
    try { 
      msg = JSON.parse(raw); 
    } catch { 
      console.warn('[WS] Unparseable message:', raw); 
      return; 
    }

    // Handle empty or invalid messages
    if (!msg || !msg.type) {
      // Handle server error messages that come without a type field
      if (msg?.message && typeof msg.message === 'string') {
        console.warn('[WS] Server error (no type field):', msg.message);
        if (addNotification) {
          addNotification({
            type: 'error',
            title: 'Connection issue',
            body: 'Server encountered an error. Retrying automatically.',
          });
        }
      } else {
        console.warn('[WS] Message missing type field:', msg);
      }
      return;
    }

    console.log(`[WS] ← ${msg.type}`, msg.data);

    switch (msg.type) {
      case 'lesson':
        setCurrentLesson(msg.data);
        if (addNotification) {
          addNotification({ 
            type: 'lesson', 
            title: 'New lesson ready', 
            body: msg.data.concept || 'Lesson generated'
          });
        }
        break;

      case 'quiz':
        setCurrentQuiz(msg.data);
        if (addNotification) {
          addNotification({ 
            type: 'quiz', 
            title: 'Quiz unlocked', 
            body: `${msg.data.questions?.length || 0} questions` 
          });
        }
        break;

      case 'progress':
        if (updateProgress) {
          updateProgress(msg.data);
        }
        break;

      case 'analysis_complete':
        // analyze Lambda finished — lesson Lambda will be invoked automatically
        if (addNotification) {
          addNotification({ 
            type: 'analyze', 
            title: 'Analysis complete', 
            body: `${msg.data.concept || 'Pattern'} detected` 
          });
        }
        break;

      case 'error':
        console.error('[WS] Server error:', msg.data);
        if (addNotification) {
          addNotification({ 
            type: 'error', 
            title: 'Error', 
            body: msg.data.message || 'Something went wrong'
          });
        }
        break;

      case 'pong':
        // Keep-alive response — no action needed
        break;

      default:
        console.warn('[WS] Unknown message type:', msg.type);
    }
  }, [setCurrentLesson, setCurrentQuiz, updateProgress, addNotification]);

  /** Start the 25s ping to prevent API Gateway timeout */
  const startPing = useCallback(() => {
    stopPing();
    pingRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ action: 'ping' }));
      }
    }, PING_INTERVAL);
  }, []);

  const stopPing = useCallback(() => {
    if (pingRef.current) { 
      clearInterval(pingRef.current); 
      pingRef.current = null; 
    }
  }, []);

  /** Connect (or reconnect) to the WebSocket */
  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    const token = localStorage.getItem('veda_jwt'); // Fixed: use veda_jwt instead of veda_token
    if (!token) {
      console.warn('[WS] No JWT found — skipping connection');
      return;
    }

    if (!WS_URL) {
      console.error('[WS] VITE_WS_URL not configured');
      return;
    }

    // Clean up any existing socket
    if (wsRef.current) {
      wsRef.current.onclose = null; // Prevent reconnect loop
      wsRef.current.close();
    }

    const url = `${WS_URL}?token=${encodeURIComponent(token)}`;
    console.log(`[WS] Connecting (attempt ${retryRef.current + 1})…`);
    setStatus('connecting');
    if (setWsStatus) setWsStatus('connecting');

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      console.log('[WS] ✅ Connected');
      retryRef.current = 0;
      setStatus('connected');
      if (setWsStatus) setWsStatus('connected');
      startPing();
    };

    ws.onmessage = (event) => {
      if (mountedRef.current) handleMessage(event.data);
    };

    ws.onerror = (err) => {
      console.error('[WS] Error:', err);
      setStatus('error');
      if (setWsStatus) setWsStatus('error');
    };

    ws.onclose = (event) => {
      stopPing();
      if (!mountedRef.current) return;

      console.warn(`[WS] Closed (code=${event.code}, reason=${event.reason})`);
      setStatus('disconnected');
      if (setWsStatus) setWsStatus('disconnected');

      // Don't retry on auth failure
      if (event.code === 4001 || event.code === 4003) {
        console.error('[WS] Auth failure — not retrying');
        return;
      }

      // Exponential back-off retry
      if (retryRef.current < MAX_RETRIES) {
        const delay = BASE_BACKOFF * Math.pow(2, retryRef.current);
        retryRef.current += 1;
        console.log(`[WS] Retrying in ${delay}ms (attempt ${retryRef.current}/${MAX_RETRIES})`);
        retryTimerRef.current = setTimeout(connect, delay);
      } else {
        console.error('[WS] Max retries reached');
        setStatus('error');
        if (setWsStatus) setWsStatus('error');
      }
    };
  }, [handleMessage, startPing, stopPing, setWsStatus]);

  /** Send a message — queue-safe (waits for OPEN state) */
  const send = useCallback((payload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
      return true;
    }
    console.warn('[WS] Cannot send — not connected');
    return false;
  }, []);

  /** Manual reconnect (exposed to UI) */
  const reconnect = useCallback(() => {
    retryRef.current = 0;
    clearTimeout(retryTimerRef.current);
    connect();
  }, [connect]);

  // Mount / Unmount lifecycle
  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      stopPing();
      clearTimeout(retryTimerRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close(1000, 'Component unmounted');
      }
    };
  }, []); // eslint-disable-line — intentionally runs once

  return { status, send, reconnect };
}