import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import crypto from 'crypto';

interface WSClient {
  id: string;
  ws: WebSocket;
  walletAddress?: string;
  rooms: Set<string>;
  lastPing: number;
  isAlive: boolean;
}

interface WSMessage {
  type: string;
  room?: string;
  data?: any;
}

type MessageHandler = (client: WSClient, data: any) => void;

export class WebSocketManager {
  private static instance: WebSocketManager;
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WSClient> = new Map();
  private rooms: Map<string, Set<string>> = new Map();
  private handlers: Map<string, MessageHandler> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  
  private constructor() {}
  
  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }
  
  initialize(server: Server): void {
    if (this.wss) {
      console.log('[WS] Already initialized');
      return;
    }
    
    this.wss = new WebSocketServer({ 
      server, 
      path: '/ws',
      perMessageDeflate: false
    });
    
    this.wss.on('connection', (ws, req) => {
      const clientId = crypto.randomUUID();
      const client: WSClient = {
        id: clientId,
        ws,
        rooms: new Set(),
        lastPing: Date.now(),
        isAlive: true
      };
      
      this.clients.set(clientId, client);
      console.log(`[WS] Client connected: ${clientId}`);
      
      ws.on('pong', () => {
        client.isAlive = true;
        client.lastPing = Date.now();
      });
      
      ws.on('message', (data) => {
        try {
          const message: WSMessage = JSON.parse(data.toString());
          this.handleMessage(client, message);
        } catch (err) {
          console.error('[WS] Invalid message:', err);
        }
      });
      
      ws.on('close', () => {
        this.removeClient(clientId);
        console.log(`[WS] Client disconnected: ${clientId}`);
      });
      
      ws.on('error', (err) => {
        console.error(`[WS] Client error ${clientId}:`, err);
        this.removeClient(clientId);
      });
      
      this.send(client, { type: 'connected', data: { clientId } });
    });
    
    this.startHeartbeat();
    this.registerDefaultHandlers();
    
    console.log('[WS] WebSocket server initialized on /ws');
  }
  
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client, id) => {
        if (!client.isAlive) {
          console.log(`[WS] Terminating inactive client: ${id}`);
          client.ws.terminate();
          this.removeClient(id);
          return;
        }
        client.isAlive = false;
        client.ws.ping();
      });
    }, 30000);
  }
  
  private registerDefaultHandlers(): void {
    this.on('subscribe', (client, data) => {
      const { room, walletAddress } = data;
      if (room) {
        this.joinRoom(client.id, room);
      }
      if (walletAddress) {
        client.walletAddress = walletAddress.toLowerCase();
        this.joinRoom(client.id, `wallet:${client.walletAddress}`);
      }
    });
    
    this.on('unsubscribe', (client, data) => {
      const { room } = data;
      if (room) {
        this.leaveRoom(client.id, room);
      }
    });
    
    this.on('ping', (client) => {
      this.send(client, { type: 'pong', data: { timestamp: Date.now() } });
    });
  }
  
  private handleMessage(client: WSClient, message: WSMessage): void {
    const handler = this.handlers.get(message.type);
    if (handler) {
      handler(client, message.data);
    }
  }
  
  on(type: string, handler: MessageHandler): void {
    this.handlers.set(type, handler);
  }
  
  private send(client: WSClient, message: WSMessage): void {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }
  
  joinRoom(clientId: string, room: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    client.rooms.add(room);
    
    if (!this.rooms.has(room)) {
      this.rooms.set(room, new Set());
    }
    this.rooms.get(room)!.add(clientId);
    
    console.log(`[WS] Client ${clientId} joined room: ${room}`);
  }
  
  leaveRoom(clientId: string, room: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.rooms.delete(room);
    }
    
    const roomClients = this.rooms.get(room);
    if (roomClients) {
      roomClients.delete(clientId);
      if (roomClients.size === 0) {
        this.rooms.delete(room);
      }
    }
  }
  
  private removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.rooms.forEach(room => {
        this.leaveRoom(clientId, room);
      });
      this.clients.delete(clientId);
    }
  }
  
  broadcast(room: string, message: WSMessage): void {
    const roomClients = this.rooms.get(room);
    if (!roomClients) return;
    
    const payload = JSON.stringify(message);
    roomClients.forEach(clientId => {
      const client = this.clients.get(clientId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(payload);
      }
    });
  }
  
  broadcastAll(message: WSMessage): void {
    const payload = JSON.stringify(message);
    this.clients.forEach(client => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(payload);
      }
    });
  }
  
  broadcastToWallet(walletAddress: string, message: WSMessage): void {
    this.broadcast(`wallet:${walletAddress.toLowerCase()}`, message);
  }
  
  broadcastPointsUpdate(walletAddress: string, data: {
    game: string;
    earned: number;
    dailyTotal: number;
    dailyCap: number;
    totalEarned: number;
    brainXProgress: number;
  }): void {
    this.broadcastToWallet(walletAddress, {
      type: 'points_update',
      data
    });
    
    this.broadcast('leaderboard', {
      type: 'leaderboard_update',
      data: {
        walletAddress,
        totalEarned: data.totalEarned
      }
    });
  }
  
  broadcastVestingUpdate(walletAddress: string, data: {
    brainXVested: number;
    lockEndDate: Date;
    totalBrainX: number;
  }): void {
    this.broadcastToWallet(walletAddress, {
      type: 'vesting_update',
      data
    });
  }
  
  getStats(): { clients: number; rooms: number } {
    return {
      clients: this.clients.size,
      rooms: this.rooms.size
    };
  }
  
  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.clients.forEach(client => {
      client.ws.close(1001, 'Server shutting down');
    });
    
    this.clients.clear();
    this.rooms.clear();
    
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
    
    console.log('[WS] WebSocket server shutdown complete');
  }
}

export const wsManager = WebSocketManager.getInstance();
