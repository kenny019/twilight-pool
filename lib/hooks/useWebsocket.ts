import { useCallback, useEffect, useRef } from "react";

type WebSocketHookOptions = {
  url: string;
  onOpen?: (socket: WebSocket) => void;
  onClose?: () => void;
  onMessage?: (data: any) => void;
  onError?: (error: Event) => void;
};

const useWebSocket = (options: WebSocketHookOptions) => {
  const { url, onOpen, onClose, onMessage, onError } = options;
  const socketRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    socketRef.current = new WebSocket(url);

    socketRef.current.onopen = function (event) {
      if (onOpen) {
        onOpen(this);
      }
    };

    socketRef.current.onclose = (ev) => {
      if (onClose) {
        onClose();
      }
      console.log("Closed event", ev);
    };

    socketRef.current.onmessage = (event) => {
      if (onMessage) {
        onMessage(event);
      }
    };

    socketRef.current.onerror = (error) => {
      if (onError) {
        onError(error);
      }
      console.error(error);
    };
  }, [url, onOpen, onClose, onMessage, onError]);

  useEffect(() => {
    connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  return socketRef.current;
};

export default useWebSocket;
