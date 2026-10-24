export const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || "https://dev.muyufly.com/api/v1"
).replace(/\/$/, "");
const SESSION_KEY = "sdu.session";
export type StoredSession = {
  token: string;
  expiresAt: string;
  userId: string;
};
export function getSession(): StoredSession | null {
  try {
    const value = JSON.parse(
      sessionStorage.getItem(SESSION_KEY) || "null",
    ) as StoredSession | null;
    return value &&
      typeof value.token === "string" &&
      typeof value.userId === "string"
      ? value
      : null;
  } catch {
    return null;
  }
}
export function saveSession(session: StoredSession | null) {
  if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else sessionStorage.removeItem(SESSION_KEY);
}
export class ApiError extends Error {
  status: number;
  code: string;
  requestId?: string;
  details?: unknown;
  constructor(
    message: string,
    status = 0,
    code = "NETWORK_ERROR",
    requestId?: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.details = details;
  }
}
type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  key?: string;
  signal?: AbortSignal;
  anonymous?: boolean;
};
export async function api<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers = new Headers();
  const session = getSession();
  if (session && !options.anonymous)
    headers.set("Authorization", `Bearer ${session.token}`);
  if (options.key) headers.set("Idempotency-Key", options.key);
  const isForm = options.body instanceof FormData;
  if (options.body !== undefined && !isForm)
    headers.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await fetch(API_BASE + path, {
      method: options.method || "GET",
      headers,
      body:
        options.body === undefined
          ? undefined
          : isForm
            ? (options.body as FormData)
            : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new ApiError("无法连接校园服务，请检查校园网络后重试。");
  }
  // Authentication failure is authoritative even if a gateway returns non-JSON.
  if (
    response.status === 401 &&
    session &&
    !options.anonymous &&
    getSession()?.token === session.token
  ) {
    saveSession(null);
    window.dispatchEvent(new Event("sdu:session-expired"));
  }
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError(
      "服务返回了无法读取的响应，请稍后重试。",
      response.status,
      "INVALID_RESPONSE",
    );
  }
  if (!response.ok) {
    throw new ApiError(
      payload.error?.message || `请求失败（${response.status}）`,
      response.status,
      payload.error?.code || "HTTP_ERROR",
      payload.requestId,
      payload.error?.details,
    );
  }
  return payload.data as T;
}
export function queryString(
  values: Record<string, string | number | undefined | null>,
) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}
export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "操作未完成，请重试。";
}
