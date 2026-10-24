# 学生在线 · 示例前端

React + Vite + TypeScript 严格模式 + Tailwind CSS 4。独立项目，直接连接校园教学后端，默认地址为 `https://dev.muyufly.com/api/v1`。

最终视觉按实施中的反馈调整为**浅灰颗粒、瑞士网格、黑到淡金的中央点云、低饱和冷色光点、点状分隔线**。首页标题为「SDUOnline BLOG」，中央恒星由旋转球形点云构成，文章正文保留暖白阅读模式。

品牌中文统一为「学生在线」。首页只展示博客标题与星系；顶部导航提供文章、我的关注、话题、商铺和「我的」，并提供可直接输入的站内搜索。文章列表顶部支持排序与筛选，话题顶部展示文章数最多的 10 个 Tag；点击 Tag 进入独立话题文章页，使用更大的标题和封面。写文章、草稿与写作空间统一位于「我的」，「查看公开主页」位于侧栏及手机空间导航顶部。手机保持五个导航入口和搜索框可见。

## 本地启动

要求 Node.js 24、pnpm 12。依赖版本和 `pnpm-lock.yaml` 已固定。

```powershell
cd D:\SDUOnlineBlogFrontend
pnpm install --frozen-lockfile
pnpm dev
```

访问 `http://localhost:5173`。开发和生产预览均固定此端口；端口被占用会明确失败。需要切换后端时，将 `.env.example` 复制为 `.env.local` 并修改 `VITE_API_BASE_URL`，然后重启 Vite。服务需允许 `http://localhost:5173` 的跨域请求。

```powershell
pnpm typecheck
pnpm test
pnpm test:e2e -- controlled
pnpm build
# 先停止开发服务，再运行：
pnpm preview
```

浏览器测试默认使用本机 Microsoft Edge。其他环境可修改 `playwright.config.ts` 的 `channel`，使用已安装的 Chromium。深层路由由 Vite 开发/预览服务回退至 SPA 入口。

## 功能入口

| 区域       | 路径与功能                                                                                                        |
| ---------- | ----------------------------------------------------------------------------------------------------------------- |
| 公开阅读   | `/` 博客与星系，`/latest` 文章（排序、关键词/Tag/作者筛选），`/following` 我的关注，`/topics` 话题与 Top 10，`/topics/:tag` 独立话题文章（排序、分页），`/search` 文章与作者搜索 |
| 阅读与作者 | `/articles/:id` 阅读、目录、评论回复、点赞收藏；`/u/:username` 主页、归档、关注与粉丝                             |
| 我的       | `/studio` 写文章与草稿管理；`/studio/write/:id?` 编辑、上传、自动保存、发布撤回、版本冲突合并                     |
| 个人中心   | `/studio/homepage` 主页实时预览与修改工具；`/studio/account` 账号与改密；旧 `/studio/settings` 跳转主页设置；`media` 素材、`favorites` 收藏夹、`likes` 点赞、`notifications` 消息 |
| 模拟商铺   | `/shop`、`/shop/:id`，`/studio/products` 商品管理，`wallet` 充值与流水，`orders` 买卖订单，`cart` 购物车与勾选结算，`addresses` 地址簿 |
| 管理治理   | `/admin/users`、`/admin/notes`、`/admin/products`，仅 ADMIN 角色显示与访问                                        |

请自行注册账号使用。仓库不包含演示账号、管理员密码或预置 Token。教学服务当前没有公开文章时，首页展示真实空状态。

## 实现约定

- `src/features/` 按业务组织；`src/api/` 统一 Fetch、会话错误处理及生成类型；`src/components/` 放共享组件和 Radix/shadcn 基础组件。
- TanStack Query 管服务端数据，Context 管会话；Token 只存于 `sessionStorage`。退出、改密、401 会清除身份与查询缓存。临时草稿和未确认交易按账号隔离，关闭浏览器标签页后不保证保留。
- 列表搜索、筛选、页码使用 URL。草稿串行保存；发布后的文章显式更新；提交所有可编辑字段及版本号。冲突时保留本地输入。新建结果未知时禁止自动重建，刷新后仍需核对草稿箱。
- 下拉选择统一使用基于现有 Radix 的 `SelectControl`，菜单、按钮和焦点颜色统一为灰绿；图标放在触发按钮内部。文章与关注页的筛选在模态框中编辑，应用后更新 URL；取消、关闭或 Esc 均丢弃本次未应用的输入，重置仅清空弹窗字段。
- 话题与商铺页移除宣传式标题及说明，直接呈现话题榜、搜索和列表；作者商铺仍保留作者名称。
- 导航、标签页和侧栏使用直角边框表示选中，与虚线分隔保持间距。个人主页的自定义强调色覆盖资料浅底、姓名、统计数字、外链、文章标签、操作和归档状态；公开展示与设置中的实时预览共用同一组件。
- 文章列表无图时用标题呈现纯色文字封面，与图片封面占用相同位置和尺寸；点赞、评论使用固定列对齐，窄屏下统计区可独占一行。文字封面由前端排版，不上传图片或修改文章附件。
- 文章封面及未插入正文的附图集中在正文上方轮播，支持箭头、缩略图、左右方向键和触摸滑动；单图不显示切换控件。正文中手动插入的图片保留原位置。
- 文章轮播和正文容器不单独设置浅色背景，直接使用页面底色；暖白阅读切换整页底色，离开文章页后恢复常规背景。
- Markdown 预览与后端使用相同解析选项：禁用 HTML、不自动链接、换行转 `<br>`；DOMPurify 二次清理。正式阅读使用服务端 `contentHtml`。
- 所有金额用整数分。充值/下单的原始参数和幂等键保存至本机会话，用于未知结果后的重试；支付结果未知时读取订单确认。
- 交易使用模拟资金。地址簿保存收货人与电话，商品可填写公开联系方式，订单展示下单快照。购物车支持勾选、修改数量、跨卖家批量支付；价格或数量变化需重新确认，结果未知时保留原请求与幂等键重试。消息中心新增成交筛选，展示商品、数量、金额并跳转订单。退款、物流和私信未提供。
- 星系每颗行星对应一篇公开文章，数量取自全站最新文章接口的 `total`，不受搜索、话题、关注和分页影响。草稿及隐藏内容不计入。每 30 秒、窗口重新聚焦和业务变更后同步；没有公开文章时仅显示中央恒星。
- 星系使用三维坐标、透视投影和深度排序，在 Canvas 上绘制。按住鼠标左键拖动或使用方向键上下左右连续环绕，可越过顶部和底部；旋转不改变缩放。滚轮或加减键缩放（0.55–2.5 倍），Home 恢复默认视角与缩放；可暂停动画，并遵循系统减少动态效果偏好。文章行星显示为约 4–6px 的小光点与淡光晕，颜色在雾蓝、青绿、浅紫范围内随机生成，饱和度为 14%。随机种子保存在本地，刷新保留颜色和椭圆轨道参数，新增文章保留已有轨道。恒星的 620 个粒子仅构成点云，不计入文章数量。

## 契约与资源

`api/openapi.json` 是后端契约快照，`src/api/schema.d.ts` 为生成类型。更新契约后执行 `pnpm api:types`。构建和类型检查不会联网抓取后端契约。

本轮契约增加 `POST /tags/batch` 和 `GET /tags/stats`，`GET /notes` 增加 `sort=latest|oldest|likes|favorites`。部署时先发布对应后端，再发布前端；旧版后端不支持新统计路径和排序。`/tags` 原有分页搜索保持兼容。主页修改与公开页共用展示组件，工具仅出现在 `/studio/homepage`；保存通过 `PATCH /me`，预览公开主页仍是独立页面。

字体由 `@fontsource/noto-sans-sc` 和 `@fontsource/noto-serif-sc` 本地打包，许可证为 SIL Open Font License。Lucide 图标由其包提供。`public/dot-rule.svg` 是本项目原创点阵分隔线，可运行 `node scripts/generate-dot-art.mjs` 重建。`grain.svg` 是背景噪点纹理；星系由 `src/features/discovery/galaxy-renderer.ts` 实时绘制，无外部图片素材或远程字体依赖。

## 验证与真实测试

见 [验证记录](docs/VERIFICATION.md)、[接口覆盖表](docs/API-COVERAGE.md)、[视觉决策与复核](docs/DESIGN.md)。受控浏览器测试独立拦截响应，生产源码没有 Mock 数据开关。

真实联调为显式选用流程，会创建两个 `qa_front_` 专用账号，以及临时文章、商品、评论和模拟订单：

```powershell
# 可选：设置 QA_ADMIN_USERNAME / QA_ADMIN_PASSWORD 以验收管理员治理。
node scripts/verify-live.mjs --run
$env:LIVE_QA = '1'
pnpm test:e2e -- live
Remove-Item Env:\LIVE_QA
node scripts/verify-live.mjs --cleanup
node scripts/report-coverage.mjs
```

运行后务必清理。脚本只操作它创建的账号和内容，并拒绝静默重复创建测试账号。凭据写入被忽略的 `.local/live-fixtures.json`，请勿提交；已有一次记录时应先清理并归档该文件，再明确开始新一轮。清理会删除测试文章、收藏夹、未引用素材，商品退回草稿。后端没有删除账号、商品或历史订单的接口，这些专用测试记录会保留。管理员的临时隐藏/禁用会在 `finally` 中恢复。真实测试关闭 trace，避免把登录凭据写入浏览器轨迹。
