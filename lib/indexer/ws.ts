import { getIndexerHttpBase } from "../api/indexer";
import type { IndexerDeposit, IndexerWithdrawal } from "../api/indexer";

export type IndexerChannel =
  | "twilight:deposit:new"
  | "twilight:withdrawal:new"
  | "twilight:block:new";

export type IndexerEvent =
  | { type: "deposit:new"; payload: IndexerDeposit }
  | { type: "withdrawal:new"; payload: IndexerWithdrawal }
  | { type: "block:new"; payload: { blockHeight: number } };

type Listener = (event: IndexerEvent) => void;

type Options = {
  channels?: IndexerChannel[];
  reconnectBackoffMs?: { initial: number; max: number };
};

const DEFAULT_CHANNELS: IndexerChannel[] = [
  "twilight:deposit:new",
  "twilight:withdrawal:new",
  "twilight:block:new",
];

function toWsUrl(httpBase: string): string {
  if (!httpBase) return "";
  return `${httpBase.replace(/^http/, "ws")}/ws`;
}

export class IndexerWsClient {
  private url: string;
  private channels: IndexerChannel[];
  private backoff: { initial: number; max: number };
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private retryDelay: number;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private closedByUser = false;

  constructor(options: Options = {}) {
    this.url = toWsUrl(getIndexerHttpBase());
    this.channels = options.channels ?? DEFAULT_CHANNELS;
    this.backoff = options.reconnectBackoffMs ?? { initial: 1_000, max: 30_000 };
    this.retryDelay = this.backoff.initial;
  }

  connect(): void {
    if (!this.url) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.closedByUser = false;
    try {
      this.ws = new WebSocket(this.url);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.retryDelay = this.backoff.initial;
      this.channels.forEach((channel) => {
        this.ws?.send(JSON.stringify({ action: "subscribe", channel }));
      });
    };

    this.ws.onmessage = (ev) => {
      const event = parseMessage(ev.data);
      if (!event) return;
      this.listeners.forEach((l) => l(event));
    };

    this.ws.onclose = () => {
      this.ws = null;
      if (!this.closedByUser) this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  close(): void {
    this.closedByUser = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }

  isOpen(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    const delay = this.retryDelay;
    this.retryDelay = Math.min(this.retryDelay * 2, this.backoff.max);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }
}

function parseMessage(raw: unknown): IndexerEvent | null {
  if (typeof raw !== "string") return null;
  let msg: unknown;
  try {
    msg = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!msg || typeof msg !== "object") return null;
  const m = msg as Record<string, unknown>;
  if (m.type === "pong") return null;

  const channel = typeof m.channel === "string" ? m.channel : m.event;
  const payload = (m.data ?? m.payload) as unknown;

  if (channel === "twilight:deposit:new" && payload) {
    return { type: "deposit:new", payload: payload as IndexerDeposit };
  }
  if (channel === "twilight:withdrawal:new" && payload) {
    return { type: "withdrawal:new", payload: payload as IndexerWithdrawal };
  }
  if (channel === "twilight:block:new" && payload) {
    return {
      type: "block:new",
      payload: payload as { blockHeight: number },
    };
  }
  return null;
}
