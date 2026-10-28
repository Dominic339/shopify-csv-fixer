// Unit tests for the client export-quota fallback rules.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { consumeExport } from "@/lib/quota";
import { FREE_EXPORTS_PER_MONTH, FREE_ROWS_PER_EXPORT } from "@/lib/plans";

function makeStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

const signedInFree = { signedIn: true, plan: "free", used: 3, limit: 3, remaining: 0 };

describe("consumeExport", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: makeStorage() });
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses the device allowance when signed out, then blocks", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.includes("status") ? json(200, { signedIn: false }) : json(401, { ok: false })
    );

    for (let i = 0; i < FREE_EXPORTS_PER_MONTH; i++) await expect(consumeExport()).resolves.toBeUndefined();
    await expect(consumeExport()).rejects.toThrow(/Free tier limit reached/);
  });

  it("does not top up a signed-in user's server limit from the device allowance", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.includes("status")
        ? json(200, signedInFree)
        : json(403, { ok: false, message: "Monthly export limit reached." })
    );

    await expect(consumeExport()).rejects.toThrow("Monthly export limit reached.");
  });

  it("falls back to the device allowance on a server error", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.includes("status") ? json(200, signedInFree) : json(500, { ok: false })
    );

    await expect(consumeExport()).resolves.toBeUndefined();
  });

  it("falls back to the device allowance when offline", async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes("status")) return json(200, signedInFree);
      throw new TypeError("Failed to fetch");
    });

    await expect(consumeExport()).resolves.toBeUndefined();
  });

  it("skips the server call for advanced plans", async () => {
    fetchMock.mockImplementation(async () => json(200, { signedIn: true, plan: "advanced", unlimited: true }));

    await consumeExport();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("never counts exports of small files", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.includes("status") ? json(200, { signedIn: false }) : json(401, { ok: false })
    );

    for (let i = 0; i < FREE_EXPORTS_PER_MONTH + 2; i++) await expect(consumeExport(FREE_ROWS_PER_EXPORT)).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
    // The full device allowance is still there for a large file.
    await expect(consumeExport(FREE_ROWS_PER_EXPORT + 1)).resolves.toBeUndefined();
  });

  it("does not count exports while a pass is running", async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.includes("status")
        ? json(200, { ...signedInFree, unlimited: true, passExpiresAt: "2099-01-01T00:00:00Z" })
        : json(403, { ok: false, message: "Monthly export limit reached." })
    );

    await expect(consumeExport(5000)).resolves.toBeUndefined();
  });
});
