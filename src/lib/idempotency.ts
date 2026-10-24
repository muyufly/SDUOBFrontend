// Store pending operations across refreshes. A retry must use the original key.
export function operationKey(userId: string, kind: string, payload: unknown) {
  const slot = `sdu.operation.${userId}.${kind}`;
  const fingerprint = JSON.stringify(payload);
  const saved = pendingOperation(userId, kind);
  if (saved) {
    if (saved.fingerprint !== fingerprint)
      throw new Error("上一笔操作尚未确认，请先按原参数重试确认。");
    return { key: saved.key, clear: () => sessionStorage.removeItem(slot) };
  }
  const key = crypto.randomUUID();
  sessionStorage.setItem(slot, JSON.stringify({ key, fingerprint }));
  return { key, clear: () => sessionStorage.removeItem(slot) };
}
export function pendingOperation(
  userId: string,
  kind: string,
): { key: string; fingerprint: string } | null {
  try {
    const value = JSON.parse(
      sessionStorage.getItem(`sdu.operation.${userId}.${kind}`) || "null",
    );
    return value &&
      typeof value.key === "string" &&
      typeof value.fingerprint === "string"
      ? value
      : null;
  } catch {
    return null;
  }
}
