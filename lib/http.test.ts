import { describe, expect, it, vi, beforeEach } from "vitest";
import wfetch from "./http";

describe("wfetch", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
    );
  });

  it("GET success returns { success: true, data }", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ foo: "bar" }), { status: 200 })
    );

    const result = await wfetch("https://example.com").get().json<{ foo: string }>();

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ foo: "bar" });
  });

  it("POST success returns { success: true, data }", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ id: 1 }), { status: 200 })
    );

    const result = await wfetch("https://example.com")
      .post({ body: JSON.stringify({ input: "test" }) })
      .json<{ id: number }>();

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: 1 });
  });

  it("HTTP 400+ returns { success: false, error }", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(
      new Response("bad request", { status: 400, statusText: "Bad Request" })
    );

    const result = await wfetch("https://example.com").get().json();
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("network error returns { success: false, error }", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockRejectedValue(new Error("network failed"));

    const result = await wfetch("https://example.com").get().json();
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
  });

  it("POST sends body and Content-Type header, custom headers merge", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({}), { status: 200 })
    );

    await wfetch("https://example.com")
      .post({
        body: '{"a":1}',
        headers: { Authorization: "Bearer token" },
      })
      .json();

    expect(mockFetch).toHaveBeenCalledWith("https://example.com", {
      method: "POST",
      body: '{"a":1}',
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      },
    });
  });

  it(".text() returns string data", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(
      new Response("hello world", { status: 200 })
    );

    const result = await wfetch("https://example.com").get().text();
    expect(result.success).toBe(true);
    expect(result.data).toBe("hello world");
  });

  it("JSON parse error returns { success: false }", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue(
      new Response("not json {{{", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      })
    );

    const result = await wfetch("https://example.com").get().json();
    expect(result.success).toBe(false);
  });

  it("calling .json() without get/post returns 'request not initialised' error", async () => {
    const result = await wfetch("https://example.com").json();
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toBe("request not initialised");
  });
});
