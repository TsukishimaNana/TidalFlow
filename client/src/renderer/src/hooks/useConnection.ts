import { useCallback, useEffect, useState } from 'react';
import type { WsServerEvent } from '@tidalflow/shared';
import { useAppContext } from '../context/AppContext';

export function useConnection(): {
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
} {
  const { connect: connectWs, disconnect: disconnectWs, isConnected } = useAppContext();
  const [hasSeenRealtimeEvent, setHasSeenRealtimeEvent] = useState(false);

  const connect = useCallback(async (): Promise<void> => {
    await connectWs();
  }, [connectWs]);

  const disconnect = useCallback(async (): Promise<void> => {
    await disconnectWs();
    setHasSeenRealtimeEvent(false);
  }, [disconnectWs]);

  useEffect(() => {
    void connect();
  }, [connect]);

  useEffect(() => {
    const unsubscribe = window.tidalflow.onWsEvent((event: WsServerEvent) => {
      if (event.type === 'server:shutdown') {
        setHasSeenRealtimeEvent(false);
        return;
      }

      setHasSeenRealtimeEvent(true);
    });

    return unsubscribe;
  }, []);

  return {
    isConnected: isConnected || hasSeenRealtimeEvent,
    connect,
    disconnect
  };
}
