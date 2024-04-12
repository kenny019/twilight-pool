import { useCallback, useEffect, useRef, useState } from "react";

type WebSocketHookOptions = {
  url: string;
  onOpen?: (socket: WebSocket) => void;
  onClose?: (socket: WebSocket) => void;
  onMessage?: (data: any) => void;
  onError?: (error: Event) => void;
};

const useWebSocket = (options: WebSocketHookOptions) => {
  const { url, onOpen, onClose, onMessage, onError } = options;
  const socketRef = useRef<WebSocket | null>(null);

  const [shouldReconnect, setShouldReconnect] = useState(true);

  const connect = useCallback(() => {
    socketRef.current = new WebSocket(url);

    socketRef.current.onopen = function () {
      if (onOpen) {
        onOpen(this);
      }
    };

    socketRef.current.onclose = function () {
      if (onClose) {
        onClose(this);
      }
    };

    socketRef.current.onmessage = function (event) {
      if (onMessage) {
        onMessage(event);
      }
    };

    socketRef.current.onerror = function (error) {
      if (onError) {
        onError(error);
      }
      console.error(error);
    };
  }, [url, onOpen, onClose, onMessage, onError]);

  const reconnect = useCallback(() => {
    setShouldReconnect(true);
  }, []);

  useEffect(() => {
    if (
      shouldReconnect &&
      socketRef.current &&
      socketRef.current.readyState !== WebSocket.CLOSED
    ) {
      socketRef.current.close();
    }

    setShouldReconnect(false);

    connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect, shouldReconnect]);

  return {
    socket: socketRef.current,
    reconnect,
  };
};

export default useWebSocket;
