import { test, expect, type Page, type Route } from "@playwright/test";
const now = "2026-10-23T10:00:00.000Z";
const author = {
  id: "qa-author",
  username: "qa_author",
  displayName: "验收作者",
  bio: "",
  avatarUrl: null,
  coverUrl: null,
  createdAt: now,
};
const me = {
  ...author,
  role: "USER",
  avatarId: null,
  coverId: null,
  homepage: {
    headline: "留住生活的片刻",
    aboutMarkdown: "",
    aboutHtml: "",
    accentColor: "#766342",
    layout: "LIST",
    links: [],
  },
};
const note = {
  id: "qa-note",
  title: "写在秋天的一页",
  contentMarkdown: "## 一次探索\n把今天的发现写下来。",
  contentHtml: "<h2>一次探索</h2><p>把今天的发现写下来。</p>",
  images: [],
  tags: ["校园"],
  status: "DRAFT",
  hidden: false,
  author,
  productId: null,
  product: null,
  version: 1,
  pinnedAt: null,
  favoriteCollectionId: null,
  likeCount: 0,
  favoriteCount: 0,
  commentCount: 0,
  liked: false,
  favorited: false,
  createdAt: now,
  updatedAt: now,
};
const paged = (items: unknown[] = []) => ({
  items,
  total: items.length,
  page: 1,
  pageSize: 20,
});
async function ok(route: Route, data: unknown) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data, requestId: "controlled-check" }),
  });
}
async function choose(page: Page, label: string, text: string) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: text, exact: true }).click();
}
async function setup(
  page: Page,
  handler?: (route: Route, path: string) => Promise<boolean>,
) {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("sdu.test-started")) {
      sessionStorage.setItem("sdu.test-started", "1");
      sessionStorage.setItem(
        "sdu.session",
        JSON.stringify({
          token: "controlled-token",
          userId: "qa-author",
          expiresAt: "2099-01-01",
        }),
      );
    }
  });
  await page.route("https://dev.muyufly.com/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace("/api/v1", "");
    if (handler && (await handler(route, path))) return;
    const data =
      path === "/me"
        ? me
        : path === "/notes/qa-note"
          ? note
          : path === "/notifications/unread-count"
            ? { count: 0 }
            : path === "/me/collections"
              ? []
              : path === "/wallet"
                ? { balanceCents: 0 }
                : paged();
    await ok(route, data);
  });
}

const publicProfile = {
  ...author,
  homepage: me.homepage,
  pinnedNoteIds: [],
  noteCount: 1,
  followerCount: 2,
  followingCount: 3,
  followed: false,
};
test("themed controls keep sorting icons inside the trigger", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/latest");
  const sorting = page.getByRole("combobox", { name: "文章排序" });
  await expect(sorting).toBeVisible();
  await expect(sorting.locator("svg").first()).toBeVisible({ timeout: 1500 });
  const bounds = await sorting.boundingBox();
  for (const icon of await sorting.locator("svg").all()) {
    const rect = await icon.boundingBox();
    expect(rect!.x).toBeGreaterThanOrEqual(bounds!.x + 10);
    expect(rect!.x + rect!.width).toBeLessThanOrEqual(
      bounds!.x + bounds!.width - 10,
    );
  }
  await sorting.click();
  await expect(page.getByRole("option", { name: "最多点赞" })).toBeVisible();
  await page.getByRole("option", { name: "最多点赞" }).click();
  await expect(sorting).toContainText("最多点赞");
});

test("filter dialog cancels draft changes and restores focus", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/latest?tag=校园");
  const trigger = page.getByRole("button", { name: "筛选", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "筛选文章" });
  await expect(dialog).toBeVisible({ timeout: 1500 });
  await dialog.getByLabel("话题 Tag").fill("尚未应用");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(new URL(page.url()).searchParams.get("tag")).toBe("校园");
  await trigger.click();
  await expect(dialog.getByLabel("话题 Tag")).toHaveValue("校园");
  await dialog.getByRole("button", { name: "取消", exact: true }).click();
  await expect(dialog).toBeHidden();
});

test("shared dropdowns support keyboard selection and empty status choices", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/topics");
  const topicSort = page.getByRole("combobox", { name: "话题排序" });
  await topicSort.focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("listbox")).toBeVisible();
  await expect(
    page.getByRole("option", { name: "按文章数量", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("End");
  await expect(
    page.getByRole("option", { name: "按名称", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(topicSort).toContainText("按名称");
  await expect(page).toHaveURL(/sort=name/);
  await topicSort.press("Space");
  await page.keyboard.press("Escape");
  await expect(topicSort).toBeFocused();
  for (const [path, label, option, param, value] of [
    ["/studio/orders", "订单状态", "已支付", "status", "PAID"],
    ["/studio/notifications", "已读状态", "未读", "readStatus", "unread"],
  ]) {
    await page.goto(path);
    await choose(page, label, option);
    expect(new URL(page.url()).searchParams.get(param)).toBe(value);
    await choose(page, label, "全部状态");
    await expect(page.getByRole("combobox", { name: label })).toContainText(
      "全部状态",
    );
    expect(new URL(page.url()).searchParams.get(param) || "all").toBe("all");
  }
  await page.goto("/studio/write/qa-note");
  await choose(page, "关联我的商品", "不关联商品");
  await expect(
    page.getByRole("combobox", { name: "关联我的商品" }),
  ).toContainText("不关联商品");
});

for (const width of [1440, 768, 390])
  test(`muted control menus and filter dialog layout at ${width}px`, async ({
    page,
  }) => {
    await setup(page, async (route, path) => {
      if (path === "/notes") {
        await ok(route, paged([{ ...note, status: "PUBLISHED" }]));
        return true;
      }
      if (path === "/tags") {
        await ok(
          route,
          paged([
            { tag: "校园", noteCount: 5 },
            { tag: "前端", noteCount: 3 },
          ]),
        );
        return true;
      }
      return false;
    });
    await page.setViewportSize({ width, height: 960 });
    await page.goto("/latest");
    const sorting = page.getByRole("combobox", { name: "文章排序" });
    const filtering = page.getByRole("button", { name: "筛选", exact: true });
    await expect(sorting).toBeVisible();
    expect(
      await sorting.evaluate((e) => getComputedStyle(e).backgroundColor),
    ).toBe(
      await filtering.evaluate((e) => getComputedStyle(e).backgroundColor),
    );
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: `docs/screenshots/controls-muted-${width}.png`,
      fullPage: true,
    });
    await sorting.click();
    const menu = page.getByRole("listbox");
    await expect(menu).toBeVisible();
    const box = await menu.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(10);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width - 10);
    await page.screenshot({
      path: `docs/screenshots/sort-menu-${width}.png`,
      fullPage: false,
    });
    await page.keyboard.press("Escape");
    await filtering.click();
    const dialog = page.getByRole("dialog", { name: "筛选文章" });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("话题 Tag").fill("校园");
    await dialog.getByRole("button", { name: /^#校园/ }).click();
    await dialog.getByLabel("文章关键词").fill("片刻");
    await dialog.getByRole("button", { name: "重置", exact: true }).click();
    await expect(dialog.getByLabel("文章关键词")).toHaveValue("");
    await expect(dialog.getByLabel("话题 Tag")).toHaveValue("");
    await expect(dialog).toHaveCSS("max-width", "480px");
    await page.screenshot({
      path: `docs/screenshots/filter-dialog-${width}.png`,
      fullPage: true,
    });
    await dialog.getByRole("button", { name: "关闭弹窗" }).click();
    await expect(filtering).toBeFocused();
    await page.goto("/following");
    await page.getByRole("button", { name: "筛选", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "筛选文章" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
  });
async function profileSetup(
  page: Page,
  handler?: (route: Route, path: string) => Promise<boolean>,
) {
  await setup(page, async (route, path) => {
    if (handler && (await handler(route, path))) return true;
    if (path === "/users/qa_author") {
      await ok(route, publicProfile);
      return true;
    }
    if (path === "/users/qa_author/archives") {
      await ok(route, [{ year: 2026, month: 10, noteCount: 1 }]);
      return true;
    }
    if (path === "/notes") {
      await ok(route, paged([{ ...note, status: "PUBLISHED" }]));
      return true;
    }
    return false;
  });
}

test("homepage edits preview live, save once and stay separate from account and public view", async ({
  page,
}) => {
  let current = structuredClone(me);
  let writes = 0;
  await profileSetup(page, async (route, path) => {
    if (path === "/me") {
      if (route.request().method() === "PATCH") {
        writes++;
        const body = route.request().postDataJSON();
        expect(body).not.toHaveProperty("oldPassword");
        current = {
          ...current,
          ...body,
          homepage: { ...current.homepage, ...body.homepage },
        };
      }
      await ok(route, current);
      return true;
    }
    return false;
  });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/studio/settings");
  await expect(page).toHaveURL(/\/studio\/homepage$/);
  const tools = page.getByRole("complementary", { name: "主页修改工具" });
  const canvas = page.getByRole("region", { name: "主页实时预览" });
  await expect(tools).toBeVisible();
  const rail = await tools.boundingBox(),
    preview = await canvas.boundingBox();
  expect(rail!.x).toBeGreaterThan(preview!.x + preview!.width);
  await expect(page.getByLabel("当前密码")).toHaveCount(0);
  await expect(
    tools.getByRole("button", { name: "保存主页设置" }),
  ).toBeDisabled();
  await tools.getByLabel("昵称", { exact: true }).fill("实时预览作者");
  await tools.getByLabel("标题短句").fill("从代码到文字，留住每次发现");
  await expect(
    canvas.getByRole("heading", { name: "实时预览作者" }),
  ).toBeVisible();
  await expect(
    canvas.getByRole("heading", { name: "从代码到文字，留住每次发现" }),
  ).toBeVisible();
  expect(writes).toBe(0);
  await choose(page, "文章排列", "图文网格");
  await expect(canvas.locator(".notes-grid")).toBeVisible();
  await tools
    .getByLabel("关于我 · Markdown")
    .fill("## 正在探索\n\n写作、前端与校园生活。");
  await canvas.getByRole("button", { name: "关于我", exact: true }).click();
  await expect(canvas.getByRole("heading", { name: "正在探索" })).toBeVisible();
  await tools.getByRole("button", { name: "保存主页设置" }).click();
  await expect(
    tools.getByRole("button", { name: "保存主页设置" }),
  ).toBeDisabled();
  expect(writes).toBe(1);
  await page.reload();
  await expect(tools.getByLabel("昵称", { exact: true })).toHaveValue(
    "实时预览作者",
  );
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: "docs/screenshots/homepage-settings-1440.png",
    fullPage: true,
  });
  await expect(
    page.getByRole("link", { name: "预览公开主页" }),
  ).toHaveAttribute("target", "_blank");
  await expect(
    page.getByRole("link", { name: "预览公开主页" }),
  ).toHaveAttribute("href", "/u/qa_author");
  await page.goto("/u/qa_author");
  await expect(
    page.getByRole("heading", { name: author.displayName, exact: true }),
  ).toBeVisible();
  await expect(
    page.locator("main .homepage-tools, main input, main textarea"),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "编辑主页" }).click();
  await expect(page).toHaveURL(/\/studio\/homepage$/);
  await page
    .locator(".studio-sidebar")
    .getByRole("link", { name: "账号设置", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "账号设置", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("当前密码")).toBeVisible();
  await expect(page.locator(".homepage-tools")).toHaveCount(0);
});

for (const width of [768, 390])
  test(`homepage editing tools fold without hiding preview at ${width}px`, async ({
    page,
  }) => {
    await profileSetup(page);
    await page.setViewportSize({ width, height: 960 });
    await page.goto("/studio/homepage");
    const tools = page.getByRole("complementary", { name: "主页修改工具" });
    await expect(tools).toBeHidden();
    await expect(
      page.getByRole("heading", { name: author.displayName, exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "修改主页", exact: true }).click();
    await expect(tools).toBeVisible();
    await tools.getByLabel("昵称", { exact: true }).fill("窄屏预览作者");
    await tools.getByRole("button", { name: "收起修改工具" }).click();
    await expect(tools).toBeHidden();
    await expect(
      page.getByRole("heading", { name: "窄屏预览作者" }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: `docs/screenshots/homepage-settings-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "修改主页", exact: true }).click();
    await page.screenshot({
      path: `docs/screenshots/homepage-tools-${width}.png`,
      fullPage: true,
    });
  });

test("article ordering and combined filters persist in URL and reset pagination", async ({
  page,
}) => {
  const requests: URLSearchParams[] = [];
  await setup(page, async (route, path) => {
    if (path === "/notes") {
      requests.push(new URL(route.request().url()).searchParams);
      await ok(route, paged([{ ...note, status: "PUBLISHED" }]));
      return true;
    }
    if (path === "/tags") {
      await ok(route, paged([{ tag: "校园 & React", noteCount: 5 }]));
      return true;
    }
    return false;
  });
  await page.goto("/latest?q=旧内容&page=3");
  await expect(
    page.getByRole("heading", { name: "文章", exact: true }),
  ).toBeVisible();
  await choose(page, "文章排序", "最多点赞");
  expect(new URL(page.url()).searchParams.get("page")).toBeNull();
  expect(new URL(page.url()).searchParams.get("q")).toBe("旧内容");
  await page.getByRole("button", { name: "筛选", exact: true }).click();
  await page.getByLabel("文章关键词").fill("校园");
  await page.getByLabel("话题 Tag").fill("校园 & React");
  await page.getByLabel("作者用户名").fill("qa_author");
  await page.getByRole("button", { name: "应用筛选" }).click();
  await expect.poll(() => requests.at(-1)?.get("tag")).toBe("校园 & React");
  expect(requests.at(-1)?.get("username")).toBe("qa_author");
  expect(requests.at(-1)?.get("sort")).toBe("likes");
  expect(requests.at(-1)?.get("q")).toBe("校园");
  await page.reload();
  await expect(page.getByRole("combobox", { name: "文章排序" })).toContainText(
    "最多点赞",
  );
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 960 });
    await page.getByRole("button", { name: "筛选", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "筛选文章" })).toBeVisible();
    await expect(page.locator("main .article-filters")).toHaveCount(0);
    await expect(page.getByLabel("话题 Tag")).toHaveValue("校园 & React");
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
    await page.screenshot({
      path: `docs/screenshots/article-filters-${width}.png`,
      fullPage: true,
    });
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "取消", exact: true })
      .click();
  }
  await page.getByRole("button", { name: "清除筛选 ×" }).click();
  await expect(page).toHaveURL(/\/latest\?sort=likes$/);
});

test("topics show global top ten before searchable tags and link to matching articles", async ({
  page,
}) => {
  const tags = [
    "校园 & React",
    "前端",
    "写作",
    "生活",
    "设计",
    "摄影",
    "读书",
    "音乐",
    "开源",
    "旅行",
  ].map((tag, i) => ({ tag, noteCount: 20 - i }));
  await setup(page, async (route, path) => {
    if (path === "/tags/stats") {
      const params = new URL(route.request().url()).searchParams;
      expect(params.get("pageSize")).toBe("10");
      expect(params.get("sort")).toBe("popular");
      expect(params.has("q")).toBe(false);
      await ok(route, paged(tags));
      return true;
    }
    if (path === "/tags") {
      await ok(
        route,
        paged(new URL(route.request().url()).searchParams.get("q") ? [] : tags),
      );
      return true;
    }
    return false;
  });
  await page.goto("/topics");
  const popular = page.getByRole("region", { name: "热门话题" });
  await expect(popular.getByRole("link")).toHaveCount(10);
  await expect(popular.getByRole("link").first()).toContainText("20 篇");
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 960 });
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
    await page.screenshot({
      path: `docs/screenshots/topics-top-ten-${width}.png`,
      fullPage: true,
    });
  }
  await page.getByPlaceholder("搜索话题").fill("不存在");
  await page.getByPlaceholder("搜索话题").press("Enter");
  await expect(
    page.getByRole("heading", { name: "话题还在酝酿" }),
  ).toBeVisible();
  await expect(popular.getByRole("link")).toHaveCount(10);
  await popular.getByRole("link").first().click();
  await expect(page).toHaveURL("/topics/" + encodeURIComponent("校园 & React"));
  await expect(
    page.getByRole("heading", { name: "#校园 & React", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".filter-summary")).toHaveCount(0);
});
test("topic article routes retain the exact tag through sorting, pagination and reload", async ({
  page,
}) => {
  const tag = "C++ / 前端 & 100%";
  const requests: URLSearchParams[] = [];
  await setup(page, async (route, path) => {
    if (path !== "/notes") return false;
    const params = new URL(route.request().url()).searchParams;
    requests.push(params);
    await ok(route, {
      ...paged([{ ...note, tags: [tag], status: "PUBLISHED" }]),
      total: 21,
      page: Number(params.get("page")),
      pageSize: 10,
    });
    return true;
  });
  const path = `/topics/${encodeURIComponent(tag)}`;
  await page.goto(path);
  await expect(
    page.getByRole("heading", { name: `#${tag}`, exact: true }),
  ).toBeVisible();
  await expect.poll(() => requests.at(-1)?.get("tag")).toBe(tag);
  await expect(page.getByRole("status")).toContainText("21 篇文章");
  await expect(
    page
      .getByRole("navigation", { name: "主导航" })
      .getByRole("link", { name: "话题", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("button", { name: "筛选", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "下一页" }).click();
  await expect.poll(() => requests.at(-1)?.get("page")).toBe("2");
  await choose(page, "话题内文章排序", "最多收藏");
  await expect.poll(() => requests.at(-1)?.get("sort")).toBe("favorites");
  expect(requests.at(-1)?.get("page")).toBe("1");
  expect(requests.at(-1)?.get("tag")).toBe(tag);
  await expect(page).toHaveURL(`${path}?sort=favorites`);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: `#${tag}`, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "话题内文章排序" }),
  ).toContainText("最多收藏");
  await expect(page.locator(".tags a")).toHaveAttribute("href", path);
  await page.locator(".note-title").click();
  await expect(page).toHaveURL("/articles/qa-note");
  await expect(page.locator(".tags a").first()).toHaveAttribute(
    "href",
    `/topics/${encodeURIComponent("校园")}`,
  );
  await page.goBack();
  await expect(page).toHaveURL(`${path}?sort=favorites`);
  await page.getByRole("link", { name: "全部话题", exact: true }).click();
  await expect(page).toHaveURL("/topics");
});

for (const width of [1440, 768, 390])
  test(`topic articles use larger covers and titles without changing the feed at ${width}px`, async ({
    page,
  }) => {
    const image =
      "data:image/svg+xml," +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect width="1280" height="720" fill="#6b7b69"/></svg>',
      );
    await setup(page, async (route, path) => {
      if (path !== "/notes") return false;
      await ok(
        route,
        paged([
          {
            ...note,
            status: "PUBLISHED",
            images: [{ id: "qa-cover", url: image }],
          },
          {
            ...note,
            id: "no-cover",
            title: "没有封面的记录",
            status: "PUBLISHED",
            likeCount: 9999,
            commentCount: 10000,
          },
        ]),
      );
      return true;
    });
    await page.setViewportSize({ width, height: 960 });
    await page.goto("/latest");
    await expect(page.locator(".note-cover").first()).toBeVisible();
    const feedCover = await page.locator(".note-cover").first().boundingBox();
    const feedTitleSize = await page
      .locator(".note-title h2")
      .first()
      .evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
    const feedTextCover = page.locator(".note-cover-text");
    await expect(feedTextCover).toHaveText("没有封面的记录");
    await expect(feedTextCover.locator("img")).toHaveCount(0);
    expect((await feedTextCover.boundingBox())!.width).toBeCloseTo(
      feedCover!.width,
      0,
    );
    for (const index of [0, 1]) {
      const withImage = await page
        .locator(".note-card")
        .nth(0)
        .locator(".note-stats svg")
        .nth(index)
        .boundingBox();
      const withoutImage = await page
        .locator(".note-card")
        .nth(1)
        .locator(".note-stats svg")
        .nth(index)
        .boundingBox();
      expect(withImage!.x).toBeCloseTo(withoutImage!.x, 0);
    }
    await page.locator(".tags a").first().click();
    await expect(page).toHaveURL(`/topics/${encodeURIComponent("校园")}`);
    const cover = page.locator(".note-cover").first();
    await expect(cover).toBeVisible();
    const topicCover = await cover.boundingBox();
    expect(topicCover!.width).toBeGreaterThan(feedCover!.width);
    expect(topicCover!.height).toBeGreaterThan(feedCover!.height);
    expect(
      await page
        .locator(".note-title h2")
        .first()
        .evaluate((e) => parseFloat(getComputedStyle(e).fontSize)),
    ).toBeGreaterThan(feedTitleSize);
    await expect(
      page.getByRole("link", { name: "没有封面的记录", exact: true }),
    ).toBeVisible();
    const textCover = page
      .locator(".note-card")
      .nth(1)
      .locator(".note-cover-text");
    await expect(textCover).toHaveText("没有封面的记录");
    expect((await textCover.boundingBox())!.width).toBeCloseTo(
      topicCover!.width,
      0,
    );
    for (const index of [0, 1]) {
      const withImage = await page
        .locator(".note-card")
        .nth(0)
        .locator(".note-stats svg")
        .nth(index)
        .boundingBox();
      const withoutImage = await page
        .locator(".note-card")
        .nth(1)
        .locator(".note-stats svg")
        .nth(index)
        .boundingBox();
      expect(withImage!.x).toBeCloseTo(withoutImage!.x, 0);
    }
    if (width === 390) {
      const body = await page.locator(".note-card-body").first().boundingBox();
      expect(topicCover!.y + topicCover!.height).toBeLessThan(body!.y);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });

test("topic articles show a recoverable error and an honest empty state", async ({
  page,
}) => {
  let failed = true;
  await setup(page, async (route, path) => {
    if (path !== "/notes") return false;
    if (failed) {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "UNAVAILABLE", message: "暂时无法读取话题文章" },
        }),
      });
    } else await ok(route, paged());
    return true;
  });
  await page.goto(`/topics/${encodeURIComponent("没有文章的话题")}`);
  await expect(page.getByText("暂时无法读取话题文章")).toBeVisible();
  failed = false;
  await page.getByRole("button", { name: "重新加载", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "这个话题还没有公开文章" }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText("0 篇文章");
  await expect(page.locator(".pagination")).toHaveCount(0);
});

const galleryImages = Array.from({ length: 9 }, (_, i) => ({
  id: `gallery-${i}`,
  url:
    "data:image/svg+xml," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${i === 1 ? 600 : 1280}" height="${i === 1 ? 1000 : 720}"><rect width="100%" height="100%" fill="${i % 2 ? "#a3ac9b" : "#687a68"}"/><text x="50%" y="50%" text-anchor="middle" fill="white" font-size="100">${i + 1}</text></svg>`,
    ),
}));

for (const width of [1440, 768, 390])
  test(`article gallery keeps all attached images above the text at ${width}px`, async ({
    page,
  }) => {
    await setup(page, async (route, path) => {
      if (path !== "/notes/qa-note") return false;
      await ok(route, { ...note, images: galleryImages });
      return true;
    });
    await page.setViewportSize({ width, height: 960 });
    await page.goto("/articles/qa-note");
    const gallery = page.getByRole("region", { name: "文章图片", exact: true });
    const stage = gallery.locator(".article-gallery-stage");
    const counter = gallery.getByRole("status");
    await expect(stage.locator("img")).toHaveAttribute(
      "src",
      galleryImages[0].url,
    );
    await expect(counter).toHaveText("1 / 9");
    await expect(page.locator(".reading-surface img")).toHaveCount(0);
    expect(
      await gallery.evaluate(
        (e) =>
          !!(
            e.compareDocumentPosition(
              document.querySelector(".reading-surface")!,
            ) & Node.DOCUMENT_POSITION_FOLLOWING
          ),
      ),
    ).toBe(true);
    await gallery
      .getByRole("button", { name: "下一张图片", exact: true })
      .click();
    await expect(counter).toHaveText("2 / 9");
    await expect(stage.locator("img")).toHaveAttribute(
      "src",
      galleryImages[1].url,
    );
    expect(
      await stage.locator("img").evaluate((e) => getComputedStyle(e).objectFit),
    ).toBe("contain");
    await gallery
      .getByRole("button", { name: "上一张图片", exact: true })
      .click();
    await gallery
      .getByRole("button", { name: "上一张图片", exact: true })
      .click();
    await expect(counter).toHaveText("9 / 9");
    await gallery.focus();
    await page.keyboard.press("Home");
    await expect(counter).toHaveText("1 / 9");
    await page.keyboard.press("ArrowRight");
    await expect(counter).toHaveText("2 / 9");
    await page.keyboard.press("End");
    await expect(counter).toHaveText("9 / 9");
    const last = gallery.getByRole("button", {
      name: "查看第 9 张图片",
      exact: true,
    });
    await expect(last).toBeInViewport();
    await expect(last).toHaveAttribute("aria-pressed", "true");
    const strip = gallery.locator(".article-gallery-thumbnails");
    await strip.evaluate((e) => {
      e.scrollLeft = 0;
    });
    await gallery
      .getByRole("button", { name: "查看第 3 张图片", exact: true })
      .click();
    await expect(counter).toHaveText("3 / 9");
    await expect(gallery.locator('[aria-pressed="true"]')).toHaveCount(1);
    const before = await stage.boundingBox();
    const y = before!.y + before!.height / 2;
    await page.mouse.move(before!.x + before!.width * 0.8, y);
    await page.mouse.down();
    await page.mouse.move(before!.x + before!.width * 0.2, y, { steps: 8 });
    await page.mouse.up();
    await expect(counter).toHaveText("4 / 9");
    const after = await stage.boundingBox();
    expect(after!.height).toBeCloseTo(before!.height, 0);
    await page.getByRole("button", { name: "暖白阅读", exact: true }).click();
    await expect(page.locator(".reading-surface")).toHaveClass(/warm/);
    await expect(counter).toHaveText("4 / 9");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });

test("article gallery preserves inline images and hides unnecessary controls for a single image", async ({
  page,
}) => {
  let images = galleryImages.slice(0, 3);
  const inline = galleryImages[1];
  await setup(page, async (route, path) => {
    if (path !== "/notes/qa-note") return false;
    await ok(route, {
      ...note,
      images,
      contentMarkdown: `正文图片 ![正文中的图片](${inline.url})`,
      contentHtml: `<p>正文图片</p><img src="${inline.url}" alt="正文中的图片"/>`,
    });
    return true;
  });
  await page.goto("/articles/qa-note");
  const gallery = page.getByRole("region", { name: "文章图片", exact: true });
  await expect(gallery.getByRole("status")).toHaveText("1 / 2");
  await expect(page.locator(".article-prose img")).toHaveAttribute(
    "src",
    inline.url,
  );
  await gallery
    .getByRole("button", { name: "下一张图片", exact: true })
    .click();
  await expect(gallery.locator(".article-gallery-stage img")).toHaveAttribute(
    "src",
    galleryImages[2].url,
  );
  images = galleryImages.slice(0, 1);
  await page.reload();
  await expect(gallery.locator(".article-gallery-stage img")).toBeVisible();
  await expect(gallery.locator("button")).toHaveCount(0);
  images = [];
  await page.reload();
  await expect(gallery).toHaveCount(0);
  await expect(page.locator(".article-prose img")).toBeVisible();
});

test("draft writes remain serial and create only one article", async ({
  page,
}) => {
  let creates = 0,
    active = 0,
    maxActive = 0;
  let current = { ...note };
  const versions: number[] = [];
  await setup(page, async (route, path) => {
    if (route.request().method() === "GET" && path === "/notes/qa-note") {
      await ok(route, current);
      return true;
    }
    if (
      (route.request().method() === "POST" && path === "/notes") ||
      (route.request().method() === "PUT" && path === "/notes/qa-note")
    ) {
      const body = route.request().postDataJSON();
      active++;
      maxActive = Math.max(maxActive, active);
      if (route.request().method() === "POST") creates++;
      else versions.push(body.version);
      await new Promise((r) => setTimeout(r, 400));
      current = { ...current, ...body, version: current.version + 1 };
      active--;
      await ok(route, current);
      return true;
    }
    return false;
  });
  await page.goto("/studio/write");
  await page.getByLabel("文章标题").fill("串行草稿");
  await page.getByLabel("文章正文").fill("第一段");
  await expect(page).toHaveURL(/write\/qa-note/);
  await page.getByLabel("文章正文").fill("第二段\n\n");
  await expect.poll(() => versions.length).toBe(1);
  await expect(page.getByText(/已保存$/)).toBeVisible();
  expect(creates).toBe(1);
  expect(maxActive).toBe(1);
  expect(versions).toEqual([2]);
});
test("conflict preserves input, then merges with the server version", async ({
  page,
}) => {
  let current = { ...note, status: "PUBLISHED" };
  const received: Record<string, unknown>[] = [];
  await setup(page, async (route, path) => {
    if (path !== "/notes/qa-note") return false;
    if (route.request().method() === "PUT") {
      const body = route.request().postDataJSON();
      received.push(body);
      if (received.length === 1) {
        current = { ...current, version: 2, title: "另一窗口的标题" };
        await route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({
            error: { code: "VERSION_CONFLICT", message: "版本已更新" },
          }),
        });
      } else {
        current = { ...current, ...body, version: 3 };
        await ok(route, current);
      }
      return true;
    }
    await ok(route, current);
    return true;
  });
  await page.goto("/studio/write/qa-note");
  await page.getByLabel("文章标题").fill("我正在合并的标题");
  await page.getByRole("button", { name: "更新文章" }).click();
  await expect(page.getByRole("dialog")).toContainText("另一窗口的标题");
  await expect(page.getByLabel("文章标题")).toHaveValue("我正在合并的标题");
  await page.getByRole("button", { name: "已核对，保存合并内容" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  expect(received[1]).toMatchObject({
    version: 2,
    title: "我正在合并的标题",
    status: "PUBLISHED",
    imageIds: [],
    productId: null,
  });
});
test("stale local backup prompts a conflict before automatic writes", async ({
  page,
}) => {
  let writes = 0;
  await setup(page, async (route, path) => {
    if (path === "/notes/qa-note" && route.request().method() === "PUT") {
      writes++;
      await ok(route, note);
      return true;
    }
    return false;
  });
  await page.addInitScript(
    ({ note }) =>
      sessionStorage.setItem(
        "sdu.draft.qa-author.qa-note",
        JSON.stringify({
          value: { ...note, title: "尚未合并的本地内容" },
          version: 0,
        }),
      ),
    { note },
  );
  await page.goto("/studio/write/qa-note");
  await expect(page.getByRole("dialog")).toContainText("文章已有更新");
  await expect(page.getByLabel("文章标题")).toHaveValue("尚未合并的本地内容");
  expect(writes).toBe(0);
});
test("uncertain recharge survives refresh and reuses exactly one key", async ({
  page,
}) => {
  const keys: string[] = [];
  const amounts: number[] = [];
  await setup(page, async (route, path) => {
    if (path !== "/wallet/recharges") return false;
    keys.push(route.request().headers()["idempotency-key"]);
    amounts.push(route.request().postDataJSON().amountCents);
    if (keys.length === 1) await route.abort("failed");
    else await ok(route, { balanceCents: 1234 });
    return true;
  });
  await page.goto("/studio/wallet");
  await page.getByLabel("充值金额（元）").fill("12.34");
  await page.getByRole("button", { name: "模拟充值", exact: true }).click();
  await expect(page.getByRole("button", { name: "确认原充值" })).toBeVisible();
  await expect(page.getByLabel("充值金额（元）")).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "减少充值金额 0.01 元" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "增加充值金额 0.01 元" }),
  ).toBeDisabled();
  await page.reload();
  await expect(page.getByLabel("充值金额（元）")).toHaveValue("12.34");
  await expect(page.getByLabel("充值金额（元）")).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "减少充值金额 0.01 元" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "增加充值金额 0.01 元" }),
  ).toBeDisabled();
  await expect(
    page.getByText("上次充值 ¥12.34 结果待确认，重试将沿用同一操作。", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "确认原充值" }).click();
  await expect(
    page.getByRole("button", { name: "模拟充值", exact: true }),
  ).toBeVisible();
  expect(keys).toHaveLength(2);
  expect(keys[0]).toBe(keys[1]);
  expect(keys[0]).toBeTruthy();
  expect(amounts).toEqual([1234, 1234]);
  await expect(page.getByLabel("充值金额（元）")).toBeEnabled();
});

test("wallet amount buttons step by exact cents, respect bounds and lock during recharge", async ({
  page,
}) => {
  const amounts: number[] = [];
  let completeRecharge!: () => void;
  const rechargeResponse = new Promise<void>((resolve) => {
    completeRecharge = resolve;
  });
  await setup(page, async (route, path) => {
    if (path !== "/wallet/recharges") return false;
    amounts.push(route.request().postDataJSON().amountCents);
    await rechargeResponse;
    await ok(route, { balanceCents: 1234 });
    return true;
  });
  await page.goto("/studio/wallet");
  const input = page.getByLabel("充值金额（元）");
  const decrease = page.getByRole("button", { name: "减少充值金额 0.01 元" });
  const increase = page.getByRole("button", { name: "增加充值金额 0.01 元" });
  await input.fill("0.29");
  await increase.click();
  await expect(input).toHaveValue("0.30");
  await decrease.click();
  await expect(input).toHaveValue("0.29");
  await input.fill("0.01");
  await expect(decrease).toBeDisabled();
  await input.press("ArrowDown");
  await expect.poll(async () => Number(await input.inputValue())).toBe(0.01);
  await increase.focus();
  await page.keyboard.press("Enter");
  await expect(input).toHaveValue("0.02");
  expect(amounts).toEqual([]);
  await input.fill("9998.99");
  await increase.click();
  await expect(input).toHaveValue("9999.00");
  await expect(increase).toBeDisabled();
  await input.press("ArrowUp");
  await expect.poll(async () => Number(await input.inputValue())).toBe(9999);
  await input.press("ArrowDown");
  await expect.poll(async () => Number(await input.inputValue())).toBe(9998.99);
  await input.fill("12.345");
  await expect(decrease).toBeDisabled();
  await expect(increase).toBeDisabled();
  await input.fill("12.34");
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(input).toBeVisible();
    for (const button of [decrease, increase]) {
      const bounds = await button.boundingBox();
      expect(bounds!.width).toBeGreaterThanOrEqual(44);
      expect(bounds!.height).toBeGreaterThanOrEqual(44);
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await page.screenshot({
      path: `output/playwright/wallet-stepper-${width}.png`,
      fullPage: true,
    });
  }
  await page.getByRole("button", { name: "模拟充值", exact: true }).click();
  await expect(input).toBeDisabled();
  await expect(decrease).toBeDisabled();
  await expect(increase).toBeDisabled();
  completeRecharge();
  await expect(input).toBeEnabled();
  await expect(decrease).toBeEnabled();
  await expect(increase).toBeEnabled();
  expect(amounts).toEqual([1234]);
});

test("wallet accepts exact cents through the maximum and rejects invalid amounts", async ({
  page,
}) => {
  const amounts: number[] = [];
  const keys: string[] = [];
  let balanceCents = 0;
  await setup(page, async (route, path) => {
    if (path === "/wallet") {
      await ok(route, { balanceCents });
      return true;
    }
    if (path !== "/wallet/recharges") return false;
    const amount = route.request().postDataJSON().amountCents;
    amounts.push(amount);
    keys.push(route.request().headers()["idempotency-key"]);
    balanceCents += amount;
    await ok(route, { balanceCents });
    return true;
  });
  await page.goto("/studio/wallet");
  const input = page.getByLabel("充值金额（元）");
  const submit = page.getByRole("button", { name: "模拟充值", exact: true });
  await expect(input).toHaveAttribute("step", "0.01");
  for (const invalid of [
    "",
    "0",
    "-1",
    "0.001",
    "12.345",
    "9999.01",
    "10000",
    "1e2",
  ]) {
    await input.fill(invalid);
    await expect(submit).toBeDisabled();
  }
  expect(amounts).toEqual([]);
  for (const [yuan, cents] of [
    ["0.01", 1],
    ["0.29", 29],
    ["12.34", 1234],
    ["9999", 999900],
  ] as const) {
    await input.fill(yuan);
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(input).toBeEnabled();
    expect(amounts.at(-1)).toBe(cents);
  }
  expect(amounts).toEqual([1, 29, 1234, 999900]);
  expect(new Set(keys).size).toBe(4);
  await expect(page.locator(".wallet-balance strong")).toHaveText("¥10,011.64");
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(input).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await page.screenshot({
      path: `output/playwright/wallet-${width}.png`,
      fullPage: true,
    });
  }
});
test("expired sessions redirect without exposing protected content", async ({
  page,
}) => {
  await setup(page, async (route, path) => {
    if (path !== "/me") return false;
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({
        error: { code: "UNAUTHORIZED", message: "会话失效" },
      }),
    });
    return true;
  });
  await page.goto("/studio/wallet");
  await expect(page).toHaveURL(/login\?next=/);
  await expect(
    page.getByRole("button", { name: "进入我的空间", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => sessionStorage.getItem("sdu.session")),
  ).toBeNull();
});
test("unavailable article and referenced media expose useful boundaries", async ({
  page,
}) => {
  await setup(page, async (route, path) => {
    if (path === "/notes/missing") {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({
          error: { message: "文章不存在或不可访问" },
          requestId: "missing-target",
        }),
      });
      return true;
    }
    if (path === "/me/media") {
      await ok(
        route,
        paged([
          {
            id: "media",
            url: "/favicon.svg",
            mimeType: "image/webp",
            width: 300,
            height: 200,
            size: 1024,
            createdAt: now,
            referenceCount: 1,
            canDelete: false,
          },
        ]),
      );
      return true;
    }
    return false;
  });
  await page.goto("/articles/missing");
  await expect(page.getByRole("alert")).toContainText("文章不存在或不可访问");
  await page.goto("/studio/media");
  await expect(page.getByRole("button", { name: "删除素材" })).toBeDisabled();
  await expect(
    page.getByText("先从文章、商品或主页移除引用后，才可删除。"),
  ).toBeVisible();
});
test("ordinary users cannot open the admin console", async ({ page }) => {
  await setup(page);
  await page.goto("/admin/users");
  await expect(
    page.getByRole("heading", { name: "这里需要管理员身份" }),
  ).toBeVisible();
});

test("article galaxy uses the global count, moves, pauses and responds to reduced motion", async ({
  page,
}) => {
  let total = 8;
  await setup(page, async (route, path) => {
    if (
      path === "/notes" &&
      new URL(route.request().url()).searchParams.get("pageSize") === "1"
    ) {
      await ok(route, { items: [], total, page: 1, pageSize: 1 });
      return true;
    }
    return false;
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "SDUOnline BLOG", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".galaxy-canvas")).toHaveAttribute(
    "data-planets",
    "8",
  );
  await expect(page.locator(".galaxy-canvas")).toHaveAttribute(
    "data-orbits",
    "8",
  );
  const drawing = page.locator(".galaxy-canvas");
  const start = await drawing.screenshot();
  await expect
    .poll(async () => Buffer.compare(start, await drawing.screenshot()))
    .not.toBe(0);
  await page.getByRole("button", { name: "暂停星系动画" }).click();
  await expect(drawing).toHaveAttribute("data-motion", "paused");
  const pausedFrame = await drawing.screenshot();
  expect(Buffer.compare(pausedFrame, await drawing.screenshot())).toBe(0);
  await drawing.focus();
  const focusedFrame = await drawing.screenshot();
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(async () => Buffer.compare(focusedFrame, await drawing.screenshot()))
    .not.toBe(0);
  const beforeDrag = await drawing.screenshot();
  const bounds = await drawing.boundingBox();
  if (!bounds) throw new Error("Galaxy canvas has no layout bounds");
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width / 2 + 60,
    bounds.y + bounds.height / 2 + 30,
    { steps: 8 },
  );
  await page.mouse.up();
  await expect
    .poll(async () => Buffer.compare(beforeDrag, await drawing.screenshot()))
    .not.toBe(0);
  const releasedFrame = await drawing.screenshot();
  await page.mouse.move(bounds.x + 10, bounds.y + 10);
  expect(Buffer.compare(releasedFrame, await drawing.screenshot())).toBe(0);
  await page.keyboard.press("Home");
  const normalFrame = await drawing.screenshot();
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  const pageScroll = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, -240);
  await expect
    .poll(async () => Buffer.compare(normalFrame, await drawing.screenshot()))
    .not.toBe(0);
  const zoomedFrame = await drawing.screenshot();
  expect(await page.evaluate(() => scrollY)).toBe(pageScroll);
  await page.mouse.wheel(0, 240);
  await expect
    .poll(async () => Buffer.compare(zoomedFrame, await drawing.screenshot()))
    .not.toBe(0);
  await page.keyboard.press("Home");
  await expect
    .poll(async () => Buffer.compare(normalFrame, await drawing.screenshot()))
    .toBe(0);
  await page
    .getByRole("heading", { name: "SDUOnline BLOG", exact: true })
    .click();
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 960 });
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
    await page.screenshot({
      path: `docs/screenshots/galaxy-eight-controlled-${width}.png`,
      fullPage: true,
    });
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(drawing).toHaveAttribute("data-motion", "paused");
  await expect(page.locator(".galaxy-canvas")).toHaveAttribute(
    "data-planets",
    "8",
  );
  total = 9;
  await page.reload();
  await expect(drawing).toHaveAttribute("data-planets", "9");
  total = 0;
  await page.reload();
  await expect(drawing).toHaveAttribute("data-planets", "0");
  await expect(
    page.getByText("等待第一颗行星", { exact: false }),
  ).toBeVisible();
});

test("article galaxy can orbit vertically through a full turn in either direction", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await setup(page, async (route, path) => {
    if (path === "/notes") {
      await ok(route, { items: [], total: 1, page: 1, pageSize: 1 });
      return true;
    }
    return false;
  });
  await page.goto("/");
  const drawing = page.locator(".galaxy-canvas");
  await expect(drawing).toHaveAttribute("data-planets", "1");
  await drawing.focus();
  const bounds = await drawing.boundingBox();
  if (!bounds) throw new Error("Galaxy canvas has no layout bounds");
  const x = bounds.x + bounds.width / 2;
  const y = bounds.y + bounds.height / 2;
  for (const direction of [-1, 1]) {
    await page.keyboard.press("Home");
    let previous = await drawing.screenshot();
    // Ten 200px drags exceed one revolution, crossing both poles.
    for (let step = 0; step < 10; step++) {
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x, y + direction * 200, { steps: 6 });
      await page.mouse.up();
      const current = await drawing.screenshot();
      expect(
        Buffer.compare(previous, current),
        `Vertical orbit stalled at direction ${direction}, drag ${step + 1}`,
      ).not.toBe(0);
      previous = current;
    }
  }
});

test("an uncertain article create cannot silently duplicate after refresh", async ({
  page,
}) => {
  let creates = 0;
  await setup(page, async (route, path) => {
    if (path === "/notes" && route.request().method() === "POST") {
      creates++;
      await route.abort("failed");
      return true;
    }
    return false;
  });
  await page.goto("/studio/write");
  await page.getByLabel("文章标题").fill("需要确认的草稿");
  await expect(
    page.getByText("上次创建结果尚未确认。", { exact: false }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "保存草稿", exact: true }),
  ).toBeDisabled();
  await expect(page.getByLabel("文章标题")).toHaveValue("需要确认的草稿");
  expect(creates).toBe(1);
});

test("unreadable order response retains the key, quantity, address and retry across refresh", async ({
  page,
}) => {
  const keys: string[] = [];
  const quantities: number[] = [];
  const bodies: Record<string, unknown>[] = [];
  const address = {
    id: "qa-address",
    recipientName: "验收收货人",
    phone: "13800000000",
    addressLine: "山东大学中心校区宿舍 1 号楼",
    label: "宿舍",
    isDefault: true,
    createdAt: now,
    updatedAt: now,
  };
  const product = {
    id: "qa-product",
    title: "测试笔记本",
    description: "仅受控测试",
    sellerContact: "seller@example.test",
    images: [],
    priceCents: 1234,
    stock: 4,
    status: "ON_SALE",
    hidden: false,
    version: 1,
    seller: { ...author, id: "seller" },
    createdAt: now,
    updatedAt: now,
  };
  const order = {
    id: "qa-order",
    buyerId: author.id,
    sellerId: "seller",
    productId: product.id,
    productTitle: product.title,
    unitPriceCents: 1234,
    quantity: 2,
    totalCents: 2468,
    status: "PENDING",
    createdAt: now,
    paidAt: null,
    cancelledAt: null,
    recipientName: address.recipientName,
    recipientPhone: address.phone,
    recipientAddress: address.addressLine,
    sellerContact: product.sellerContact,
  };
  await setup(page, async (route, path) => {
    if (path === "/me/addresses") {
      // Even if the original address is removed after the unknown response,
      // retry must preserve the original request rather than select a new one.
      await ok(route, {
        items: keys.length
          ? [
              {
                ...address,
                id: "qa-new-address",
                addressLine: "新的默认收货地址",
              },
            ]
          : [address],
      });
      return true;
    }
    if (path === "/products/qa-product") {
      await ok(route, product);
      return true;
    }
    if (path === "/orders/qa-order") {
      await ok(route, order);
      return true;
    }
    if (path === "/orders" && route.request().method() === "POST") {
      keys.push(route.request().headers()["idempotency-key"]);
      const body = route.request().postDataJSON();
      bodies.push(body);
      quantities.push(body.quantity);
      if (keys.length === 1)
        await route.fulfill({
          status: 201,
          contentType: "text/html",
          body: "truncated response",
        });
      else await ok(route, order);
      return true;
    }
    return false;
  });
  await page.goto("/shop/qa-product");
  await page.getByLabel("购买数量").fill("2");
  await expect(page.getByText(address.addressLine)).toBeVisible();
  await page.getByRole("button", { name: "立即购买", exact: true }).click();
  await expect(page.getByRole("button", { name: "确认原订单" })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("购买数量")).toHaveValue("2");
  await expect(page.getByLabel("购买数量")).toBeDisabled();
  await page.getByRole("button", { name: "确认原订单" }).click();
  await expect(page).toHaveURL(/orders\/qa-order/);
  expect(keys[1]).toBe(keys[0]);
  expect(quantities).toEqual([2, 2]);
  expect(bodies).toEqual([
    { productId: product.id, quantity: 2, addressId: address.id },
    { productId: product.id, quantity: 2, addressId: address.id },
  ]);
});

test("unknown cart checkout preserves its request after purchased rows and address disappear", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const keys: string[] = [];
  const bodies: Record<string, unknown>[] = [];
  let purchased = false;
  const address = {
    id: "checkout-address",
    recipientName: "批量结算收货人",
    phone: "13800000000",
    addressLine: "山东大学中心校区宿舍 2 号楼",
    label: "宿舍",
    isDefault: true,
    createdAt: now,
    updatedAt: now,
  };
  const product = {
    id: "cart-product",
    title: "购物车测试笔记本",
    description: "仅受控测试",
    images: [],
    priceCents: 1234,
    stock: 4,
    status: "ON_SALE",
    hidden: false,
    version: 1,
    seller: { ...author, id: "seller" },
    sellerContact: "seller@example.test",
    createdAt: now,
    updatedAt: now,
  };
  const item = {
    id: "cart-row",
    productId: product.id,
    quantity: 2,
    product,
    available: true,
    createdAt: now,
    updatedAt: now,
  };
  const order = {
    id: "cart-order",
    buyerId: author.id,
    sellerId: "seller",
    productId: product.id,
    productTitle: product.title,
    unitPriceCents: 1234,
    quantity: 2,
    totalCents: 2468,
    status: "PAID",
    createdAt: now,
    paidAt: now,
    cancelledAt: null,
    recipientName: address.recipientName,
    recipientPhone: address.phone,
    recipientAddress: address.addressLine,
    sellerContact: product.sellerContact,
  };
  await setup(page, async (route, path) => {
    if (path === "/cart") {
      await ok(route, { items: purchased ? [] : [item] });
      return true;
    }
    if (path === "/me/addresses") {
      await ok(route, { items: purchased ? [] : [address] });
      return true;
    }
    if (path === "/wallet") {
      await ok(route, {
        balanceCents: purchased ? 7532 : 10000,
      });
      return true;
    }
    if (path === "/cart/checkout") {
      keys.push(route.request().headers()["idempotency-key"]);
      bodies.push(route.request().postDataJSON());
      purchased = true;
      if (keys.length === 1)
        await route.fulfill({
          status: 201,
          contentType: "text/html",
          body: "truncated response",
        });
      else await ok(route, { orders: [order], totalCents: 2468 });
      return true;
    }
    return false;
  });
  await page.goto("/studio/cart");
  const quickCheckout = page.getByRole("region", { name: "快捷结算" });
  await expect(
    quickCheckout.getByRole("button", { name: "结算已选商品" }),
  ).toBeDisabled();
  await page.getByRole("checkbox", { name: `选择${product.title}` }).check();
  await expect(quickCheckout).toContainText("¥24.68");
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 844 });
    if (width <= 1200) await expect(quickCheckout).toBeInViewport();
    else await expect(quickCheckout).toBeHidden();
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
    await page.screenshot({
      path: `docs/screenshots/cart-quick-checkout-${width}.png`,
      fullPage: false,
    });
  }
  await quickCheckout.getByRole("button", { name: "结算已选商品" }).click();
  const dialog = page.getByRole("dialog", { name: "确认批量结算" });
  await expect(dialog).toContainText(address.addressLine);
  await expect(quickCheckout).toBeHidden();
  await dialog.getByRole("button", { name: "确认支付 ¥24.68" }).click();
  await expect(
    page.getByRole("heading", { name: "上一笔结算结果待确认" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "购物车还空着" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "上一笔结算结果待确认" }),
  ).toBeVisible();
  await expect(quickCheckout).toBeHidden();
  await page.getByRole("button", { name: "确认原结算结果" }).click();
  await expect(
    page.getByRole("heading", { name: "结算成功", exact: true }),
  ).toBeVisible();
  expect(keys).toHaveLength(2);
  expect(keys[1]).toBe(keys[0]);
  expect(bodies).toEqual([
    {
      items: [{ cartItemId: item.id, quantity: 2, unitPriceCents: 1234 }],
      addressId: address.id,
    },
    {
      items: [{ cartItemId: item.id, quantity: 2, unitPriceCents: 1234 }],
      addressId: address.id,
    },
  ]);
});

test("an uncertain payment is resolved by reading the actual order once", async ({
  page,
}) => {
  let paid = false,
    pays = 0;
  const order = {
    id: "qa-order",
    buyerId: author.id,
    sellerId: "seller",
    productId: "product",
    productTitle: "测试笔记本",
    unitPriceCents: 1234,
    quantity: 1,
    totalCents: 1234,
    status: "PENDING",
    createdAt: now,
    paidAt: null,
    cancelledAt: null,
  };
  await setup(page, async (route, path) => {
    if (path === "/orders/qa-order/pay") {
      paid = true;
      pays++;
      await route.abort("failed");
      return true;
    }
    if (path === "/orders/qa-order") {
      await ok(route, {
        ...order,
        status: paid ? "PAID" : "PENDING",
        paidAt: paid ? now : null,
      });
      return true;
    }
    return false;
  });
  await page.goto("/studio/orders/qa-order");
  await page.getByRole("button", { name: "使用模拟余额支付" }).click();
  await expect(page.locator(".page-title .badge")).toHaveText("已支付");
  await expect(
    page.getByRole("button", { name: "使用模拟余额支付" }),
  ).toBeHidden();
  expect(pays).toBe(1);
});
for (const width of [1440, 768, 390])
  test(`responsive layout, warm reading and editor at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 960 });
    await setup(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
    await page.screenshot({
      path: `docs/screenshots/home-${width}.png`,
      fullPage: true,
    });
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "跳至内容" })).toBeFocused();
    await page.goto("/articles/qa-note");
    await page.getByRole("button", { name: "暖白阅读" }).click();
    await expect(page.locator(".reading-surface")).toHaveClass(/warm/);
    await page.screenshot({
      path: `docs/screenshots/article-${width}.png`,
      fullPage: true,
    });
    await page.goto("/studio/write/qa-note");
    await expect(page.getByLabel("文章标题")).toHaveValue(note.title);
    if (width === 390) {
      await page.getByRole("button", { name: "预览", exact: true }).click();
      await expect(page.locator(".editor-preview")).toBeVisible();
      await expect(page.getByLabel("文章正文")).toBeHidden();
      await page.getByRole("button", { name: "写作", exact: true }).click();
    }
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
    await page.screenshot({
      path: `docs/screenshots/editor-${width}.png`,
      fullPage: true,
    });
  });

test("reading navigation, header search and My writing entry stay connected", async ({
  page,
}) => {
  const feeds: string[] = [];
  await profileSetup(page, async (route, path) => {
    if (path === "/notes") {
      const params = new URL(route.request().url()).searchParams;
      feeds.push(params.get("feed") || "search");
      await ok(
        route,
        params.get("feed") === "latest" && params.get("pageSize") !== "1"
          ? paged([{ ...note, status: "PUBLISHED" }])
          : paged(),
      );
      return true;
    }
    return false;
  });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/");
  await expect(page).toHaveTitle(/学生在线/);
  await expect(
    page.getByRole("link", { name: "学生在线博客首页" }),
  ).toBeVisible();
  await expect(page.locator("main a[href^='/studio']")).toHaveCount(0);
  await expect(page.locator("header a[href='/studio/write']")).toHaveCount(0);
  await expect(page.locator(".feed-section, .discovery-aside")).toHaveCount(0);
  const navigation = page.getByRole("navigation", { name: "主导航" });
  await navigation.getByRole("link", { name: "文章", exact: true }).click();
  await expect(page).toHaveURL(/\/latest$/);
  await expect(
    navigation.getByRole("link", { name: "文章", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { name: note.title })).toBeVisible();
  await navigation.getByRole("link", { name: "我的关注" }).click();
  await expect(page).toHaveURL(/\/following$/);
  await expect(
    page.getByRole("heading", { name: "关注的人还没有发布文章" }),
  ).toBeVisible();
  expect(feeds).toContain("following");
  const search = page.getByRole("search", { name: "站内搜索" });
  await search.getByRole("searchbox").fill("  校园 & React  ");
  await search.getByRole("searchbox").press("Enter");
  await expect(page).toHaveURL(/\/search\?q=/);
  expect(new URL(page.url()).searchParams.get("q")).toBe("校园 & React");
  await expect(search.getByRole("searchbox")).toHaveValue("校园 & React");
  await page.reload();
  await expect(search.getByRole("searchbox")).toHaveValue("校园 & React");
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "我的关注", exact: true }),
  ).toBeVisible();
  await navigation.getByRole("link", { name: "我的", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "我的", exact: true }),
  ).toBeVisible();
  const publicProfileLink = page
    .locator(".studio-sidebar")
    .getByRole("link")
    .first();
  await expect(publicProfileLink).toContainText("查看公开主页");
  await publicProfileLink.click();
  await expect(
    page.getByRole("heading", { name: author.displayName, exact: true }),
  ).toBeVisible();
  await navigation.getByRole("link", { name: "我的", exact: true }).click();
  await page.getByRole("link", { name: "写文章", exact: true }).click();
  await expect(page.getByLabel("文章标题")).toBeVisible();
  await page.goto("/?feed=following&tag=校园&page=2");
  await expect(page).toHaveURL(/\/following\?/);
  expect(new URL(page.url()).searchParams.get("tag")).toBe("校园");
  expect(new URL(page.url()).searchParams.get("page")).toBe("2");
  await page.goto("/?tag=校园");
  await expect(page).toHaveURL(/\/latest\?/);
  await page.getByRole("button", { name: "清除筛选 ×" }).click();
  await expect(page).toHaveURL(/\/latest$/);
});

test("phone navigation keeps search, following login and My accessible", async ({
  page,
}) => {
  await setup(page);
  await page.addInitScript(() => sessionStorage.removeItem("sdu.session"));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const navigation = page.getByRole("navigation", { name: "主导航" });
  for (const label of ["文章", "我的关注", "话题", "商铺", "我的"]) {
    await expect(
      navigation.getByRole("link", { name: label, exact: true }),
    ).toBeInViewport();
  }
  await expect(
    page.getByRole("searchbox", { name: "搜索文章与作者" }),
  ).toBeInViewport();
  await expect(
    page.getByRole("link", { name: "登录", exact: true }),
  ).toBeVisible();
  await navigation.getByRole("link", { name: "我的关注" }).click();
  await page.getByRole("link", { name: "登录查看关注" }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Ffollowing$/);
  expect(new URL(page.url()).searchParams.get("next")).toBe("/following");
  await navigation.getByRole("link", { name: "我的", exact: true }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fstudio$/);
  const search = page.getByRole("search", { name: "站内搜索" });
  await search.getByRole("searchbox").fill("校园");
  await search.getByRole("button", { name: "提交站内搜索" }).click();
  await expect(page).toHaveURL(/\/search\?q=/);
  expect(new URL(page.url()).searchParams.get("q")).toBe("校园");
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
});
