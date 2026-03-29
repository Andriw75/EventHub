import { createContext, useContext, createSignal, type JSX } from "solid-js";

interface WebSocketContextType {
  socket: () => WebSocket | null;
  isConnected: () => boolean;
  connect: () => void;
  disconnect: () => void;
  sendMessage: (msg: any) => void;
  addMessageListener: (cb: (data: any) => void) => void;
}

const WebSocketContext = createContext<WebSocketContextType>();

export const WebSocketProvider = (props: { children: JSX.Element }) => {
  const [socket, setSocket] = createSignal<WebSocket | null>(null);
  const [isConnected, setIsConnected] = createSignal(false);
  const messageListeners: Array<(data: any) => void> = [];

  const wsUrl = import.meta.env.VITE_CONEX_WS;

  const connect = () => {
    if (socket()) return;

    const ws = new WebSocket(wsUrl);
    setSocket(ws);

    ws.onopen = () => {
      setIsConnected(true);
      console.log("✅ WebSocket conectado");
    };

    ws.onmessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        data = event.data;
      }
      messageListeners.forEach((cb) => cb(data));
    };

    ws.onerror = (err) => {
      console.error("❌ Error WebSocket:", err);
    };

    ws.onclose = () => {
      console.log("🔒 WebSocket cerrado");
      setIsConnected(false);
      setSocket(null);
    };
  };

  const disconnect = () => {
    const ws = socket();
    if (ws) ws.close();
    setSocket(null);
    setIsConnected(false);
  };

  const sendMessage = (msg: any) => {
    const ws = socket();
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(typeof msg === "string" ? msg : JSON.stringify(msg));
    } else {
      console.warn("⚠️ WebSocket no conectado");
    }
  };

  const addMessageListener = (cb: (data: any) => void) => {
    messageListeners.push(cb);
  };

  return (
    <WebSocketContext.Provider
      value={{
        socket,
        isConnected,
        connect,
        disconnect,
        sendMessage,
        addMessageListener,
      }}
    >
      {props.children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const ctx = useContext(WebSocketContext);
  if (!ctx)
    throw new Error("useWebSocket debe usarse dentro de <WebSocketProvider>");
  return ctx;
};
