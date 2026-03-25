import { describe, expect, it } from "vitest";
import {
  isProtectedPagePath,
  shouldRejectPageMethod,
} from "./pageMethodGuard";

describe("isProtectedPagePath", () => {
  it("protects app page routes", () => {
    expect(isProtectedPagePath("/")).toBe(true);
    expect(isProtectedPagePath("/wallet")).toBe(true);
    expect(isProtectedPagePath("/test")).toBe(true);
  });

  it("skips next internals, api paths, and assets", () => {
    expect(isProtectedPagePath("/_next/static/chunk.js")).toBe(false);
    expect(isProtectedPagePath("/_next/image")).toBe(false);
    expect(isProtectedPagePath("/api/health")).toBe(false);
    expect(isProtectedPagePath("/favicon.ico")).toBe(false);
    expect(isProtectedPagePath("/images/logo.png")).toBe(false);
  });
});

describe("shouldRejectPageMethod", () => {
  it("allows safe methods on protected pages", () => {
    expect(shouldRejectPageMethod("/", "GET")).toBe(false);
    expect(shouldRejectPageMethod("/wallet", "HEAD")).toBe(false);
  });

  it("rejects unsafe methods on protected pages", () => {
    expect(shouldRejectPageMethod("/", "POST")).toBe(true);
    expect(shouldRejectPageMethod("/wallet", "DELETE")).toBe(true);
    expect(shouldRejectPageMethod("/test", "PATCH")).toBe(true);
  });

  it("does not reject methods for excluded paths", () => {
    expect(shouldRejectPageMethod("/api/health", "POST")).toBe(false);
    expect(shouldRejectPageMethod("/_next/static/chunk.js", "POST")).toBe(
      false
    );
    expect(shouldRejectPageMethod("/favicon.ico", "POST")).toBe(false);
  });
});
