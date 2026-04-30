import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../api/indexer", () => ({
  getIndexerHttpBase: () => "http://indexer.test",
}));

import { IndexerWsClient, parseMessage } from "./ws";

class MockSocket {
  static instances: MockSocket[] = [];
  static OPEN = 1;
  static CONNECTING = 0;
  static CLOSED = 3;

  url: string;
  readyState = MockSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  sent: string[] = [];

  constructor(url: string) {
    this.url = url;
    MockSocket.instances.push(this);
  }
  send(data: string) {
    this.sent.push(data);
  }
  close() {
    this.readyState = MockSocket.CLOSED;
    this.onclose?.();
  }
  open() {
    this.readyState = MockSocket.OPEN;
    this.onopen?.();
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  MockSocket.instances = [];
  // @ts-expect-error - test stub
  globalThis.WebSocket = MockSocket;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("IndexerWsClient", () => {
  it("sends subscribe frames on first open", () => {
    const client = new IndexerWsClient();
    client.connect();
    const sock = MockSocket.instances[0];
    sock.open();
    expect(sock.sent.length).toBe(3);
    expect(sock.sent[0]).toContain("twilight:deposit:new");
  });

  it("does not fire onReconnect on the first open", () => {
    const client = new IndexerWsClient();
    const reconnectSpy = vi.fn();
    client.onReconnect(reconnectSpy);
    client.connect();
    MockSocket.instances[0].open();
    expect(reconnectSpy).not.toHaveBeenCalled();
  });

  it("fires onReconnect on subsequent opens after disconnect", () => {
    const client = new IndexerWsClient({
      reconnectBackoffMs: { initial: 100, max: 1000 },
    });
    const reconnectSpy = vi.fn();
    client.onReconnect(reconnectSpy);
    client.connect();
    MockSocket.instances[0].open();
    expect(reconnectSpy).not.toHaveBeenCalled();

    // Simulate disconnect; client schedules reconnect.
    MockSocket.instances[0].close();
    // Advance past max possible jittered delay (1.5 * 100ms = 150ms).
    vi.advanceTimersByTime(200);
    expect(MockSocket.instances.length).toBe(2);
    MockSocket.instances[1].open();
    expect(reconnectSpy).toHaveBeenCalledTimes(1);
  });

  it("reconnect backoff is jittered within [0.5, 1.5) of base delay", () => {
    const client = new IndexerWsClient({
      reconnectBackoffMs: { initial: 1000, max: 30_000 },
    });
    const setTimeoutSpy = vi.spyOn(global, "setTimeout");
    client.connect();
    MockSocket.instances[0].open();
    MockSocket.instances[0].close();

    const lastCall = setTimeoutSpy.mock.calls[setTimeoutSpy.mock.calls.length - 1];
    const delay = lastCall[1] as number;
    expect(delay).toBeGreaterThanOrEqual(500);
    expect(delay).toBeLessThan(1500);
  });

  it("close() cancels pending reconnect timer", () => {
    const client = new IndexerWsClient({
      reconnectBackoffMs: { initial: 100, max: 1000 },
    });
    client.connect();
    MockSocket.instances[0].open();
    MockSocket.instances[0].close();
    expect(MockSocket.instances.length).toBe(1);
    client.close();
    vi.advanceTimersByTime(2000);
    // No new socket created after close().
    expect(MockSocket.instances.length).toBe(1);
  });
});

describe("parseMessage", () => {
  it("returns null for non-string", () => {
    expect(parseMessage(123)).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    expect(parseMessage("not-json")).toBeNull();
  });

  it("returns null for pong type", () => {
    expect(parseMessage(JSON.stringify({ type: "pong" }))).toBeNull();
  });

  it("parses deposit:new", () => {
    const ev = parseMessage(
      JSON.stringify({
        channel: "twilight:deposit:new",
        data: { id: 7, depositAmount: "100" },
      })
    );
    expect(ev?.type).toBe("deposit:new");
  });

  it("accepts `event` and `payload` aliases", () => {
    const ev = parseMessage(
      JSON.stringify({
        event: "twilight:withdrawal:new",
        payload: { id: 9 },
      })
    );
    expect(ev?.type).toBe("withdrawal:new");
  });

  it("parses block:new", () => {
    const ev = parseMessage(
      JSON.stringify({
        channel: "twilight:block:new",
        data: { blockHeight: 840_500 },
      })
    );
    expect(ev?.type).toBe("block:new");
    if (ev?.type === "block:new") {
      expect(ev.payload.blockHeight).toBe(840_500);
    }
  });
});
