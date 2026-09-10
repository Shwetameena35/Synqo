export interface WSMessage {
  type: string;
  workspaceId: string;
  userId: string;
  userName: string;
  payload: any;
  timestamp: number;
}

export type WSHandler = (msg: WSMessage) => void;

class RealtimeClient {
  private socket: WebSocket | null = null;
  private handlers: Set<WSHandler> = new Set();
  private reconnectTimer: any = null;
  private workspaceId: string = '';
  private isConnected: boolean = false;
  private statusListeners: Set<(connected: boolean) => void> = new Set();

  connect(workspaceId: string, userName = 'Developer') {
    if (this.socket && this.workspaceId === workspaceId) return;

    this.workspaceId = workspaceId;
    this.disconnect();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const host = isDev ? 'localhost:8080' : window.location.host;

    // Use VITE_WS_URL from .env if defined, otherwise derive from host/protocol
    const configuredWs = import.meta.env.VITE_WS_URL;
    const wsBase = configuredWs ? configuredWs.replace(/\/$/, '') : `${protocol}//${host}/api/v1/ws`;
    const url = `${wsBase}/${workspaceId}?userName=${encodeURIComponent(userName)}`;

    try {
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        this.isConnected = true;
        this.notifyStatus(true);
      };

      this.socket.onmessage = (event) => {
        try {
          const data: WSMessage = JSON.parse(event.data);
          this.handlers.forEach((h) => h(data));
        } catch (e) {
          console.error('Error parsing WS message', e);
        }
      };

      this.socket.onclose = () => {
        this.isConnected = false;
        this.notifyStatus(false);
        this.scheduleReconnect();
      };

      this.socket.onerror = () => {
        this.isConnected = false;
        this.notifyStatus(false);
      };
    } catch (err) {
      console.warn('WebSocket connection error:', err);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (this.workspaceId) {
        this.connect(this.workspaceId);
      }
    }, 4000);
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.isConnected = false;
    this.notifyStatus(false);
  }

  subscribe(handler: WSHandler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  onStatusChange(listener: (connected: boolean) => void) {
    this.statusListeners.add(listener);
    listener(this.isConnected);
    return () => this.statusListeners.delete(listener);
  }

  private notifyStatus(status: boolean) {
    this.statusListeners.forEach((l) => l(status));
  }

  send(type: string, payload: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          type,
          workspaceId: this.workspaceId,
          payload,
          timestamp: Date.now(),
        })
      );
    }
  }
}

export const realtime = new RealtimeClient();
