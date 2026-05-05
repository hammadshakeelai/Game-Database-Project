import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseSocketReturn {
  socket: Socket | null;
  status: ConnectionStatus;
  error: string | null;
}

/**
 * Centralized socket hook with automatic connection management,
 * reconnection tracking, and clean disconnection on unmount.
 */
export function useSocket(): UseSocketReturn {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const serverUrl = (import.meta as any).env?.VITE_APP_URL || window.location.origin;

    const newSocket = io(serverUrl, {
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      setStatus('connected');
      setError(null);
    });

    newSocket.on('disconnect', (reason) => {
      setStatus('disconnected');
      if (reason === 'io server disconnect') {
        // Server forcefully disconnected — try to reconnect
        newSocket.connect();
      }
    });

    newSocket.on('connect_error', (err) => {
      setStatus('error');
      setError(`Connection failed: ${err.message}`);
    });

    newSocket.io.on('reconnect_attempt', (attempt) => {
      setStatus('connecting');
      setError(`Reconnecting... (attempt ${attempt})`);
    });

    newSocket.io.on('reconnect', () => {
      setStatus('connected');
      setError(null);
    });

    newSocket.io.on('reconnect_failed', () => {
      setStatus('error');
      setError('Failed to reconnect after multiple attempts.');
    });

    // Listen for server-side errors
    newSocket.on('error', (data: { message: string }) => {
      setError(data.message);
    });

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return {
    socket: socketRef.current,
    status,
    error,
  };
}
