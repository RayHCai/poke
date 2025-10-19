/**
 * Socket.IO client for real-time events
 */
import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';
import { supabase } from './supabase';

const API_URL = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

class SocketClient {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  /**
   * Connect to socket server with auth
   */
  async connect(): Promise<void> {
    if (this.socket?.connected) return;

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
      console.warn('No auth token available for socket connection');
      return;
    }

    this.socket = io(API_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.socket.on('connect', () => {
      console.info('Socket connected');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', () => {
      console.info('Socket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error, this.reconnectAttempts);
      this.reconnectAttempts++;
    });
  }

  /**
   * Disconnect from socket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Subscribe to nearby updates
   */
  onNearbyUpdate(callback: (data: { userId: string; lat: number; lng: number }) => void): void {
    this.socket?.on('nearby:update', callback);
  }

  /**
   * Subscribe to incoming throws
   */
  onThrowIncoming(callback: (data: { throwId: string; thrower: { username: string; avatarUrl?: string } }) => void): void {
    this.socket?.on('throw:incoming', callback);
  }

  /**
   * Subscribe to throw results
   */
  onThrowResult(callback: (data: { throwId: string; result: 'hit' | 'miss' }) => void): void {
    this.socket?.on('throw:result', callback);
  }

  /**
   * Subscribe to new matches
   */
  onMatchNew(callback: (data: { matchId: string; user: { username: string; avatarUrl?: string } }) => void): void {
    this.socket?.on('match:new', callback);
  }

  /**
   * Remove all listeners
   */
  removeAllListeners(): void {
    this.socket?.removeAllListeners();
  }
}

export const socketClient = new SocketClient();
