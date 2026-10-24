import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, getSession, saveSession } from "../../src/api/client";
import { operationKey, pendingOperation } from "../../src/lib/idempotency";
import { parseCents } from "../../src/lib/format";
import { markdown, safeHtml } from "../../src/lib/markdown";
import {
  emptyArticle,
  fingerprint,
  notePayload,
} from "../../src/features/articles/editor-model";
beforeEach(() => {
  sessionStorage.clear();
  vi.unstubAllGlobals();
});
describe("request and identity boundaries", () => {
  it("clears the current identity on 401 and keeps error evidence", async () => {
    saveSession({ token: "expired", userId: "a", expiresAt: "" });
    const expire = vi.fn();
    window.addEventListener("sdu:session-expired", expire, { once: true });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { code: "UNAUTHORIZED", message: "会话过期" },
            requestId: "trace-1",
          }),
          { status: 401 },
        ),
      ),
    );
    await expect(api("/me")).rejects.toMatchObject({
      status: 401,
      requestId: "trace-1",
    });
    expect(getSession()).toBeNull();
    expect(expire).toHaveBeenCalledOnce();
  });
  it("an old in-flight 401 cannot clear a newly signed in identity", async () => {
    saveSession({ token: "old", userId: "a", expiresAt: "" });
    let respond!: (r: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            respond = resolve;
          }),
      ),
    );
    const request = api("/me");
    saveSession({ token: "new", userId: "b", expiresAt: "" });
    respond(
      new Response(JSON.stringify({ error: { message: "expired" } }), {
        status: 401,
      }),
    );
    await expect(request).rejects.toMatchObject({ status: 401 });
    expect(getSession()?.token).toBe("new");
  });
  it("never retries an ambiguous mutation automatically", async () => {
    const fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetch);
    await expect(
      api("/orders", { method: "POST", body: { quantity: 1 }, key: "stable" }),
    ).rejects.toMatchObject({ status: 0 });
    expect(fetch).toHaveBeenCalledOnce();
  });
  it("lets the browser supply the multipart boundary", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ data: { id: "image" } })),
      );
    vi.stubGlobal("fetch", fetch);
    await api("/media", { method: "POST", body: new FormData() });
    expect(fetch.mock.calls[0][1].headers.has("Content-Type")).toBe(false);
  });
});
describe("money and operation identity", () => {
  it("parses decimal yuan into exact integer cents", () => {
    expect(parseCents("0.29")).toBe(29);
    expect(parseCents("0.01")).toBe(1);
    expect(parseCents("123.45")).toBe(12345);
    expect(parseCents("9999")).toBe(999900);
    expect(parseCents("1.234")).toBeNull();
    expect(parseCents("-1")).toBeNull();
    expect(parseCents("1e2")).toBeNull();
    expect(parseCents("Infinity")).toBeNull();
    expect(parseCents("")).toBeNull();
  });
  it("preserves the same key through failures and reloads, isolates users and rejects changed payloads", () => {
    const a = operationKey("a", "recharge", { amountCents: 1000 });
    expect(operationKey("a", "recharge", { amountCents: 1000 }).key).toBe(
      a.key,
    );
    expect(() =>
      operationKey("a", "recharge", { amountCents: 5000 }),
    ).toThrow();
    expect(operationKey("b", "recharge", { amountCents: 1000 }).key).not.toBe(
      a.key,
    );
    a.clear();
    expect(pendingOperation("a", "recharge")).toBeNull();
    expect(operationKey("a", "recharge", { amountCents: 1000 }).key).not.toBe(
      a.key,
    );
  });
});
describe("safe article updates", () => {
  it("always submits all editable fields and the concurrency version", () => {
    expect(notePayload(emptyArticle, 8)).toEqual({
      title: "",
      contentMarkdown: "",
      imageIds: [],
      tags: [],
      status: "DRAFT",
      productId: null,
      version: 8,
    });
  });
  it("normalizes backend-trimmed whitespace to avoid repeated automatic saves", () => {
    expect(
      fingerprint({
        ...emptyArticle,
        title: " 标题 ",
        contentMarkdown: "正文\n\n",
      }),
    ).toBe(
      fingerprint({ ...emptyArticle, title: "标题", contentMarkdown: "正文" }),
    );
  });
  it("disables raw HTML, unsafe links and script execution", () => {
    const html = markdown(
      "<img src=x onerror=alert(1)>\n\n[bad](javascript:alert(1))",
    );
    expect(html).not.toContain("<img");
    expect(
      safeHtml(
        "<p>正文</p><script>alert(1)</script><img src=x onerror=alert(1)>",
      ),
    ).not.toMatch(/<script|onerror/i);
    expect(markdown("one\ntwo")).toContain("<br>");
  });
});
