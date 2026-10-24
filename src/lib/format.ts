export const money = (cents: number) =>
  new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY" }).format(
    cents / 100,
  );
export const date = (value: string) =>
  new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
export const dateTime = (value: string) =>
  new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
export const excerpt = (markdown: string, length = 120) =>
  markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#*`>~_|]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, length);
export const statusText: Record<string, string> = {
  DRAFT: "草稿",
  PUBLISHED: "已发布",
  ON_SALE: "在售",
  OFF_SALE: "已下架",
  PENDING: "待支付",
  PAID: "已支付",
  CANCELLED: "已取消",
  RECHARGE: "模拟充值",
  PURCHASE: "购买支出",
  SALE: "售出收入",
};
export function parseCents(value: string): number | null {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return null;
  const [yuan, fraction = ""] = value.split(".");
  const result = Number(yuan) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(result) ? result : null;
}
