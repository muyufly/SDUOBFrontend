import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
test.skip(
  process.env.LIVE_QA !== "1",
  "Opt in with LIVE_QA=1 after scripts/verify-live.mjs --run",
);
test.use({ trace: "off", screenshot: "only-on-failure" }); // Login traces would contain credentials.
test("real service: login, draft, upload, publish, collect, reply, notification and mock payment", async ({
  page,
  browser,
}) => {
  test.setTimeout(120000);
  const file = ".local/live-fixtures.json",
    f = JSON.parse(fs.readFileSync(file, "utf8"));
  const [writer, reader] = f.users;
  async function login(p: Page, user: { username: string; password: string }) {
    await p.goto("/login");
    await p.getByLabel("用户名").fill(user.username);
    await p.getByPlaceholder("至少 8 位字符").fill(user.password);
    await p.getByRole("button", { name: "进入我的空间" }).click();
    await expect(p).not.toHaveURL(/\/login/);
  }
  await login(page, writer);
  await page.goto("/studio/write");
  await page.getByLabel("文章标题").fill("【浏览器联调】浅灰纸页上的记录");
  await page
    .getByLabel("文章正文")
    .fill(
      "## 写下一点发现\n\n这是前端真实联调专用文章，验收后删除。\n\n**所有界面操作都连接真实教学后端。**",
    );
  await expect(page).toHaveURL(/\/studio\/write\/.+/);
  const id = new URL(page.url()).pathname.split("/").pop()!;
  f.notes.push(id);
  fs.writeFileSync(file, JSON.stringify(f, null, 2));
  await page.getByLabel("上传封面与配图").setInputFiles({
    name: "qa-pixel.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect(page.getByAltText("已选图片 1")).toBeVisible();
  await page.getByRole("button", { name: "发布", exact: true }).click();
  await expect(page.getByRole("button", { name: "更新文章" })).toBeVisible();
  await expect(page.getByText(/已保存$/)).toBeVisible();
  await page.goto(`/u/${writer.username}`);
  await expect(page.locator(`a[href="/articles/${id}"]`).first()).toBeVisible();
  const readerContext = await browser.newContext({
    baseURL: "http://localhost:5173",
  });
  const second = await readerContext.newPage();
  try {
    await login(second, reader);
    await second.goto(`/articles/${id}`);
    await second.getByRole("button", { name: "点赞 0", exact: true }).click();
    await expect(
      second.getByRole("button", { name: "点赞 1", exact: true }),
    ).toBeVisible();
    await second.getByRole("button", { name: "收藏 0", exact: true }).click();
    await expect(
      second.getByRole("button", { name: "已收藏 1", exact: true }),
    ).toBeVisible();
    await second.getByRole("button", { name: "整理到…" }).click();
    await second
      .getByRole("button", { name: "验收收藏夹·已改名", exact: true })
      .click();
    await expect(second.getByRole("dialog")).toBeHidden();
    await second
      .getByLabel("评论内容")
      .fill("浏览器联调评论：纸张质感已经更新。");
    await second.getByRole("button", { name: "发表评论", exact: true }).click();
    await expect(
      second.getByText("浏览器联调评论：纸张质感已经更新。", { exact: true }),
    ).toBeVisible();
    await page.goto("/studio/notifications?type=COMMENT");
    await page.getByRole("button", { name: "查看内容" }).first().click();
    await expect(page).toHaveURL(/comment=/);
    await expect(page.locator("#focused-comment")).toContainText(
      "浏览器联调评论：纸张质感已经更新。",
    );
    await page
      .locator("#focused-comment")
      .getByRole("button", { name: "回复", exact: true })
      .click();
    await page
      .locator("#focused-comment")
      .getByLabel("回复内容")
      .fill("已收到，测试后清理。");
    await page
      .locator("#focused-comment")
      .getByRole("button", { name: "发送回复" })
      .click();
    await expect(page.locator("#focused-comment")).toContainText(
      "已收到，测试后清理。",
    );
    await second.goto("/studio/wallet");
    await expect(second.locator(".wallet-balance strong")).toBeVisible();
    const beforeBalance = await second
      .locator(".wallet-balance strong")
      .innerText();
    const centsBefore = Math.round(
      Number(beforeBalance.replace(/[^0-9.]/g, "")) * 100,
    );
    await second.getByRole("button", { name: "模拟充值", exact: true }).click();
    await expect(second.locator(".wallet-balance strong")).toHaveText(
      "¥" + ((centsBefore + 1000) / 100).toFixed(2),
    ); // integer cents, not yuan
    await second.goto(`/shop/${f.products[0]}`);
    await second.getByRole("button", { name: "创建订单", exact: true }).click();
    await expect(second).toHaveURL(/\/studio\/orders\/.+/);
    await second
      .getByRole("button", { name: /确认支付|模拟余额支付|支付/ })
      .click();
    await expect(second.locator(".page-title .badge")).toHaveText("已支付");
    await second.screenshot({
      path: "docs/screenshots/live-order.png",
      fullPage: true,
    });
    await page.goto("/studio/orders?role=seller");
    await expect(page.getByText("【联调测试】校园手记").first()).toBeVisible();
    await page.goto("/studio/wallet");
    await expect(page.locator(".wallet-balance strong")).toBeVisible();
    const walletResponse = await page.request.get(
      "https://dev.muyufly.com/api/v1/wallet",
      { headers: { Authorization: `Bearer ${writer.token}` } },
    );
    const wallet = await walletResponse.json();
    await expect(page.locator(".wallet-balance strong")).toHaveText(
      "¥" + (wallet.data.balanceCents / 100).toFixed(2),
    );
  } finally {
    await readerContext.close();
  }
  fs.writeFileSync(
    "docs/live-browser.json",
    JSON.stringify(
      {
        at: new Date().toISOString(),
        passed: true,
        scenarios: [
          "UI login",
          "serial draft creation",
          "image upload",
          "publish",
          "author homepage",
          "like and favorite collection",
          "comment and reply",
          "notification target location",
          "mock recharge",
          "create and pay order",
          "seller orders and wallet",
        ],
      },
      null,
      2,
    ),
  );
});
