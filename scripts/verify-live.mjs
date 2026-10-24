// Explicit opt-in only. Creates isolated QA users; never operates on existing user content.
// Credentials stay in the ignored .local directory. Admin credentials come from environment.
import fs from "node:fs";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const base = process.env.LIVE_API_BASE_URL || "https://dev.muyufly.com/api/v1";
const mode = process.argv[2];
if (!["--run", "--cleanup"].includes(mode))
  throw new Error("Use --run or --cleanup explicitly.");
fs.mkdirSync(".local", { recursive: true });
fs.mkdirSync("docs", { recursive: true });
const fixtureFile = ".local/live-fixtures.json";
const evidence = [];
let fixtures = fs.existsSync(fixtureFile)
  ? JSON.parse(fs.readFileSync(fixtureFile, "utf8"))
  : { users: [], notes: [], media: [], products: [], collections: [] };
const persist = () =>
  fs.writeFileSync(fixtureFile, JSON.stringify(fixtures, null, 2));
async function call(
  path,
  { token, method = "GET", body, key, expected = 200 } = {},
) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (key) headers["Idempotency-Key"] = key;
  if (body && !(body instanceof FormData))
    headers["Content-Type"] = "application/json";
  const response = await fetch(base + path, {
    method,
    headers,
    body:
      body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  const json = await response.json();
  evidence.push({
    method,
    path,
    status: response.status,
    requestId: json.requestId,
  });
  assert.equal(
    response.status,
    expected,
    `${method} ${path}: ${json.error?.code || ""} ${json.error?.message || ""}`,
  );
  return json.data;
}
const noteInput = (note, change = {}) => ({
  title: note.title,
  contentMarkdown: note.contentMarkdown,
  imageIds: note.images.map((i) => i.id),
  tags: note.tags,
  status: note.status,
  productId: note.productId,
  version: note.version,
  ...change,
});
const productInput = (p, change = {}) => ({
  title: p.title,
  description: p.description,
  imageIds: p.images.map((i) => i.id),
  priceCents: p.priceCents,
  stock: p.stock,
  status: p.status,
  version: p.version,
  ...change,
});
async function login(user) {
  const session = await call("/auth/login", {
    method: "POST",
    body: { username: user.username, password: user.password },
  });
  Object.assign(user, session);
  persist();
  return user;
}
async function cleanup() {
  for (const user of fixtures.users) {
    assert.match(user.username, /^qa_front_/);
    await login(user);
    const token = user.token;
    await call("/me", {
      token,
      method: "PATCH",
      body: {
        avatarId: null,
        coverId: null,
        bio: "前端自动验收专用账号；测试已结束。",
        homepage: { aboutMarkdown: "", links: [] },
      },
    });
    const notes = await call("/me/notes?pageSize=50", { token });
    for (const n of notes.items)
      await call(`/notes/${n.id}`, { token, method: "DELETE" });
    const products = await call("/me/products?pageSize=50", { token });
    for (const p of products.items)
      await call(`/products/${p.id}`, {
        token,
        method: "PUT",
        body: productInput(p, { status: "DRAFT", imageIds: [] }),
      });
    const collections = await call("/me/collections", { token });
    for (const c of collections)
      if (c.id)
        await call(`/me/collections/${c.id}`, { token, method: "DELETE" });
    const media = await call("/me/media?pageSize=50", { token });
    for (const m of media.items)
      if (m.canDelete)
        await call(`/media/${m.id}`, { token, method: "DELETE" });
    const others = fixtures.users.filter((u) => u.id !== user.id);
    for (const other of others)
      await call(`/users/${other.username}/follow`, {
        token,
        method: "POST",
        body: { active: false },
      });
    await call("/notifications/read-all", { token, method: "PUT" });
    await call("/auth/logout", { token, method: "POST" });
  }
  fixtures.cleanedAt = new Date().toISOString();
  persist();
}
try {
  if (mode === "--cleanup") {
    await cleanup();
  } else {
    if (fixtures.users.length)
      throw new Error(
        "Existing QA run found. Reuse its browser fixtures, then clean up; do not create duplicate users.",
      );
    await call("/health");
    const cors = await fetch(base + "/notes", {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:5173",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers":
          "authorization,content-type,idempotency-key",
      },
    });
    assert.equal(
      cors.headers.get("access-control-allow-origin"),
      "http://localhost:5173",
    );
    const suffix = Date.now().toString(36);
    for (const role of ["writer", "reader"]) {
      const username = `qa_front_${suffix}_${role[0]}`;
      const password = `Qa!${randomUUID()}`;
      const session = await call("/auth/register", {
        method: "POST",
        body: {
          username,
          password,
          displayName: role === "writer" ? "前端验收·作者" : "前端验收·读者",
        },
        expected: 201,
      });
      fixtures.users.push({
        username,
        password,
        ...session,
        id: session.user.id,
      });
      persist();
    }
    const [writer, reader] = fixtures.users;
    await login(writer);
    const a = writer.token,
      b = reader.token;
    await call("/me", { token: a });
    await call("/me", {
      token: a,
      method: "PATCH",
      body: {
        bio: "专用联调账号，测试后清理内容。",
        homepage: {
          headline: "浅灰纸页上的校园记录",
          aboutMarkdown: "## 关于\n只用于前端验收。",
          accentColor: "#657153",
          layout: "GRID",
          links: [{ label: "山大在线", url: "https://www.sdu.edu.cn" }],
        },
      },
    });
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    );
    const form = new FormData();
    form.append("file", new Blob([png], { type: "image/png" }), "qa-pixel.png");
    const media = await call("/media", {
      token: a,
      method: "POST",
      body: form,
      expected: 201,
    });
    fixtures.media.push(media.id);
    persist();
    let note = await call("/notes", {
      token: a,
      method: "POST",
      body: {
        title: "【联调测试】写在秋天的一页",
        contentMarkdown:
          "## 从校园开始\n这篇文章用于验证真实接口。\n\n**测试结束后删除。**",
        imageIds: [media.id],
        tags: ["前端联调"],
        status: "DRAFT",
        productId: null,
      },
      expected: 201,
    });
    fixtures.notes.push(note.id);
    persist();
    await call(`/notes/${note.id}`, { token: b, expected: 404 });
    note = await call(`/notes/${note.id}`, {
      token: a,
      method: "PUT",
      body: noteInput(note, { status: "PUBLISHED" }),
    });
    await call(`/notes/${note.id}`, {
      token: a,
      method: "PUT",
      body: noteInput(note, { version: note.version - 1 }),
      expected: 409,
    });
    await call(`/media/${media.id}`, {
      token: a,
      method: "DELETE",
      expected: 409,
    });
    await call(`/notes/${note.id}/pin`, {
      token: a,
      method: "POST",
      body: { active: true },
    });
    await call(`/users/${writer.username}/follow`, {
      token: b,
      method: "POST",
      body: { active: true },
    });
    await call(`/notes/${note.id}/like`, {
      token: b,
      method: "POST",
      body: { active: true },
    });
    await call(`/notes/${note.id}/favorite`, {
      token: b,
      method: "POST",
      body: { active: true },
    });
    const collection = await call("/me/collections", {
      token: b,
      method: "POST",
      body: { name: "验收收藏夹" },
      expected: 201,
    });
    fixtures.collections.push(collection.id);
    persist();
    await call(`/me/collections/${collection.id}`, {
      token: b,
      method: "PATCH",
      body: { name: "验收收藏夹·已改名" },
    });
    await call(`/me/favorites/${note.id}/collection`, {
      token: b,
      method: "PUT",
      body: { collectionId: collection.id },
    });
    const comment = await call(`/notes/${note.id}/comments`, {
      token: b,
      method: "POST",
      body: { body: "联调评论：从这里继续交流。", parentId: null },
      expected: 201,
    });
    const reply = await call(`/notes/${note.id}/comments`, {
      token: a,
      method: "POST",
      body: { body: "联调回复：已收到。", parentId: comment.id },
      expected: 201,
    });
    fixtures.comment = comment.id;
    fixtures.reply = reply.id;
    persist();
    for (const path of [
      "/users?q=" + writer.username,
      `/users/${writer.username}`,
      `/users/${writer.username}/archives`,
      `/users/${writer.username}/followers`,
      `/users/${reader.username}/following`,
      "/notes?feed=following",
      "/tags",
      "/me/notes",
      "/me/favorites",
      "/me/likes",
      "/me/collections",
      `/notes/${note.id}`,
      `/notes/${note.id}/comments`,
      `/comments/${comment.id}/replies`,
      `/comments/${reply.id}/context`,
      "/me/media",
      "/notifications",
      "/notifications/unread-count",
    ])
      await call(path, {
        token: path === "/me/notes" || path === "/me/media" ? a : b,
      });
    const notifications = await call("/notifications", { token: b });
    assert.ok(
      notifications.items.some(
        (n) => n.type === "REPLY" && n.commentId === reply.id,
      ),
    );
    await call(`/notifications/${notifications.items[0].id}/read`, {
      token: b,
      method: "PUT",
    });
    await call("/notifications/read-all", { token: b, method: "PUT" });
    let product = await call("/products", {
      token: a,
      method: "POST",
      body: {
        title: "【联调测试】校园手记",
        description: "仅用于模拟交易验收，无真实商品或资金。",
        priceCents: 1234,
        stock: 5,
        status: "ON_SALE",
        imageIds: [],
      },
      expected: 201,
    });
    fixtures.products.push(product.id);
    persist();
    product = await call(`/products/${product.id}`, {
      token: a,
      method: "PUT",
      body: productInput(product, {
        description: "模拟交易验收专用商品，测试后转为草稿。",
      }),
    });
    for (const path of ["/products", "/me/products", `/products/${product.id}`])
      await call(path, { token: a });
    const rechargeKey = randomUUID();
    await call("/wallet/recharges", {
      token: b,
      method: "POST",
      body: { amountCents: 5000 },
      key: rechargeKey,
      expected: 201,
    });
    await call("/wallet/recharges", {
      token: b,
      method: "POST",
      body: { amountCents: 5000 },
      key: rechargeKey,
      expected: 201,
    });
    assert.equal((await call("/wallet", { token: b })).balanceCents, 5000);
    const orderKey = randomUUID();
    const order = await call("/orders", {
      token: b,
      method: "POST",
      body: { productId: product.id, quantity: 2 },
      key: orderKey,
      expected: 201,
    });
    const duplicate = await call("/orders", {
      token: b,
      method: "POST",
      body: { productId: product.id, quantity: 2 },
      key: orderKey,
      expected: 201,
    });
    assert.equal(order.id, duplicate.id);
    fixtures.order = order.id;
    persist();
    await call(`/orders/${order.id}/pay`, { token: b, method: "POST" });
    await call(`/orders/${order.id}/pay`, { token: b, method: "POST" });
    assert.equal(
      (await call(`/orders/${order.id}`, { token: b })).status,
      "PAID",
    );
    assert.equal((await call("/wallet", { token: b })).balanceCents, 2532);
    assert.equal((await call("/wallet", { token: a })).balanceCents, 2468);
    assert.equal(
      (await call(`/products/${product.id}`, { token: b })).stock,
      3,
    );
    for (const token of [a, b]) {
      await call("/orders?role=" + (token === a ? "seller" : "buyer"), {
        token,
      });
      await call("/wallet/ledger", { token });
    }
    const cancelled = await call("/orders", {
      token: b,
      method: "POST",
      body: { productId: product.id, quantity: 1 },
      key: randomUUID(),
      expected: 201,
    });
    await call(`/orders/${cancelled.id}/cancel`, { token: b, method: "POST" });
    if (process.env.QA_ADMIN_USERNAME && process.env.QA_ADMIN_PASSWORD) {
      const admin = await call("/auth/login", {
        method: "POST",
        body: {
          username: process.env.QA_ADMIN_USERNAME,
          password: process.env.QA_ADMIN_PASSWORD,
        },
      });
      const token = admin.token;
      try {
        for (const kind of ["users", "notes", "products"])
          await call(
            `/admin/${kind}?q=${encodeURIComponent(kind === "users" ? writer.username : "联调测试")}`,
            { token },
          );
        try {
          await call(`/admin/notes/${note.id}`, {
            token,
            method: "PATCH",
            body: { hidden: true },
          });
          await call(`/notes/${note.id}`, { token: b, expected: 404 });
        } finally {
          await call(`/admin/notes/${note.id}`, {
            token,
            method: "PATCH",
            body: { hidden: false },
          });
        }
        try {
          await call(`/admin/products/${product.id}`, {
            token,
            method: "PATCH",
            body: { hidden: true },
          });
          await call(`/products/${product.id}`, { token: b, expected: 404 });
        } finally {
          await call(`/admin/products/${product.id}`, {
            token,
            method: "PATCH",
            body: { hidden: false },
          });
        }
        try {
          await call(`/admin/users/${reader.id}`, {
            token,
            method: "PATCH",
            body: { disabled: true },
          });
        } finally {
          await call(`/admin/users/${reader.id}`, {
            token,
            method: "PATCH",
            body: { disabled: false },
          });
        }
      } finally {
        await call("/auth/logout", { token, method: "POST" });
      }
    } else
      evidence.push({
        skipped:
          "Admin moderation: QA_ADMIN_USERNAME / QA_ADMIN_PASSWORD not supplied",
      });
    await login(reader);
    const newPassword = `Qa!${randomUUID()}`;
    await call("/auth/password", {
      token: reader.token,
      method: "PUT",
      body: { oldPassword: reader.password, newPassword },
    });
    reader.password = newPassword;
    persist();
    await login(reader);
    await call(`/comments/${reply.id}`, { token: a, method: "DELETE" });
    fixtures.verifiedAt = new Date().toISOString();
    persist();
  }
  fs.writeFileSync(
    `docs/live-${mode === "--run" ? "verification" : "cleanup"}.json`,
    JSON.stringify(
      { at: new Date().toISOString(), base, passed: true, checks: evidence },
      null,
      2,
    ),
  );
  console.log(
    `Live ${mode}: ${evidence.length} checks passed. Credentials omitted; evidence saved in docs.`,
  );
} catch (error) {
  fs.writeFileSync(
    "docs/live-failure.json",
    JSON.stringify(
      { at: new Date().toISOString(), error: error.message, checks: evidence },
      null,
      2,
    ),
  );
  console.error(error.message);
  process.exitCode = 1;
}
