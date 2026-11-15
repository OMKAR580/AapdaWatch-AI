/**
 * AapdaWatch AI — WebSocket Real-Time Live Feed Client
 * Connects to the FastAPI /ws/live-feed endpoint for instant multi-tab & multi-user live alerts.
 */

type WebSocketListener = (data: Record<string, unknown>) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private listeners: Set<WebSocketListener> = new Set();
  private isConnected = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectInterval = 3000;

  constructor() {
    const host =
      typeof window !== "undefined"
        ? process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8001/ws/live-feed"
        : "ws://localhost:8001/ws/live-feed";
    this.url = host;
  }

  public connect() {
    if (typeof window === "undefined" || this.ws) return;

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.isConnected = true;
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          this.listeners.forEach((listener) => {
            try {
              listener(parsed);
            } catch {
              // ignore listener errors
            }
          });
        } catch {
          // ignore parse errors
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.ws = null;
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.isConnected = false;
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.reconnectInterval);
  }

  public subscribe(listener: WebSocketListener): () => void {
    this.listeners.add(listener);
    if (!this.ws) {
      this.connect();
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  public broadcast(payload: Record<string, unknown>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: "BROADCAST", payload }));
    }
  }

  public getStatus(): boolean {
    return this.isConnected;
  }
}

export const liveFeedSocket = new WebSocketService();
