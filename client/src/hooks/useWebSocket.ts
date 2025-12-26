import { useState, useEffect, useCallback, useRef } from 'react';

interface WSMessage {
  type: string;
  room?: string;
  data?: any;
}

type MessageHandler = (data: any) => void;

interface UseWebSocketOptions {
  walletAddress?: string;
  rooms?: string[];
  onConnect?: () => void;
  onDisconnect?: () => void;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  isConnecting: boolean;
  send: (message: WSMessage) => void;
  subscribe: (room: string) => void;
  unsubscribe: (room: string) => void;
  on: (type: string, handler: MessageHandler) => () => void;
  latency: number;
}

const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000];
const MAX_RECONNECT_ATTEMPTS = 10;

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const { walletAddress, rooms = [], onConnect, onDisconnect } = options;
  
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [latency, setLatency] = useState(0);
  
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Map<string, Set<MessageHandler>>>(new Map());
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPingRef = useRef<number>(0);
  
  const getWsUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }, []);
  
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || isConnecting) {
      return;
    }
    
    setIsConnecting(true);
    
    try {
      const ws = new WebSocket(getWsUrl());
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log('[WS] Connected');
        setIsConnected(true);
        setIsConnecting(false);
        reconnectAttemptRef.current = 0;
        
        if (walletAddress) {
          ws.send(JSON.stringify({
            type: 'subscribe',
            data: { walletAddress }
          }));
        }
        
        rooms.forEach(room => {
          ws.send(JSON.stringify({
            type: 'subscribe',
            data: { room }
          }));
        });
        
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            lastPingRef.current = Date.now();
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25000);
        
        onConnect?.();
      };
      
      ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          
          if (message.type === 'pong') {
            setLatency(Date.now() - lastPingRef.current);
            return;
          }
          
          const handlers = handlersRef.current.get(message.type);
          if (handlers) {
            handlers.forEach(handler => handler(message.data));
          }
          
          const allHandlers = handlersRef.current.get('*');
          if (allHandlers) {
            allHandlers.forEach(handler => handler(message));
          }
        } catch (err) {
          console.error('[WS] Failed to parse message:', err);
        }
      };
      
      ws.onclose = (event) => {
        console.log('[WS] Disconnected:', event.code, event.reason);
        setIsConnected(false);
        setIsConnecting(false);
        wsRef.current = null;
        
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
        
        onDisconnect?.();
        
        if (event.code !== 1000 && reconnectAttemptRef.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = RECONNECT_DELAYS[Math.min(reconnectAttemptRef.current, RECONNECT_DELAYS.length - 1)];
          console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttemptRef.current + 1})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptRef.current++;
            connect();
          }, delay);
        }
      };
      
      ws.onerror = (error) => {
        console.error('[WS] Error:', error);
      };
    } catch (err) {
      console.error('[WS] Failed to connect:', err);
      setIsConnecting(false);
    }
  }, [getWsUrl, walletAddress, rooms, onConnect, onDisconnect, isConnecting]);
  
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
  }, []);
  
  useEffect(() => {
    connect();
    return () => disconnect();
  }, []);
  
  useEffect(() => {
    if (isConnected && walletAddress && wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        data: { walletAddress }
      }));
    }
  }, [walletAddress, isConnected]);
  
  const send = useCallback((message: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);
  
  const subscribe = useCallback((room: string) => {
    send({ type: 'subscribe', data: { room } });
  }, [send]);
  
  const unsubscribe = useCallback((room: string) => {
    send({ type: 'unsubscribe', data: { room } });
  }, [send]);
  
  const on = useCallback((type: string, handler: MessageHandler): (() => void) => {
    if (!handlersRef.current.has(type)) {
      handlersRef.current.set(type, new Set());
    }
    handlersRef.current.get(type)!.add(handler);
    
    return () => {
      handlersRef.current.get(type)?.delete(handler);
    };
  }, []);
  
  return {
    isConnected,
    isConnecting,
    send,
    subscribe,
    unsubscribe,
    on,
    latency
  };
}
