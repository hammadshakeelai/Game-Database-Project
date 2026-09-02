import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuth } from '../auth/AuthContext';

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'failed';

interface UseSocketResult {
  socket: Socket | null;
  connection: ConnectionState;
  /** Set when the connection failed for a reason worth showing the player. */
  error: string | null;
}

/**
 * One authenticated socket for the signed-in session.
 *
 * The ID token is supplied through a callback rather than captured once, so
 * every reconnect attempt sends a *fresh* token. Firebase tokens expire after an
 * hour, and a captured one would make long sessions fail to reconnect.
 */
export function useSocket(): UseSocketResult {
  const { status, getToken } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connection, setConnection] = useState<ConnectionState>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'signed-in') {
      setSocket(null);
      setConnection('idle');
      return;
    }

    setConnection('connecting');
    setError(null);

    const instance = io({
      // socket.io calls this before every connection attempt, including retries.
      auth: (cb: (data: { token: string | null }) => void) => {
        void getToken().then(token => cb({ token }));
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    const onConnect = () => {
      setConnection('connected');
      setError(null);
    };
    const onDisconnect = (reason: Socket.DisconnectReason) => {
      // An explicit client disconnect is not an error state.
      if (reason === 'io client disconnect') return;
      setConnection('reconnecting');
    };
    const onConnectError = (err: Error) => {
      // Auth failures are terminal — retrying with the same bad token is futile.
      if (/AUTH_/.test(err.message)) {
        setConnection('failed');
        setError(
          err.message === 'AUTH_UNAVAILABLE'
            ? 'The game server is not configured for sign-in yet.'
            : 'Your session has expired. Please sign in again.',
        );
        instance.close();
        return;
      }
      setConnection('reconnecting');
    };

    instance.on('connect', onConnect);
    instance.on('disconnect', onDisconnect);
    instance.on('connect_error', onConnectError);

    setSocket(instance);

    return () => {
      instance.off('connect', onConnect);
      instance.off('disconnect', onDisconnect);
      instance.off('connect_error', onConnectError);
      instance.close();
      setSocket(null);
    };
  }, [status, getToken]);

  return { socket, connection, error };
}
