# SDUOnlineBlog-示例前端

React + Vite + TypeScript 严格模式 + Tailwind CSS 4。

## 本地启动

要求 Node.js 24、pnpm 12。

```powershell
cd D:\SDUOnlineBlogFrontend
pnpm install --frozen-lockfile
pnpm dev
```

访问 `http://localhost:5173`。开发和生产预览均固定此端口；端口被占用会明确失败。需要切换后端时，将 `.env.example` 复制为 `.env.local` 并修改 `VITE_API_BASE_URL`，然后重启 Vite。服务需允许 `http://localhost:5173` 的跨域请求。

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


## 契约与资源

`api/openapi.json` 是后端契约快照，`src/api/schema.d.ts` 为生成类型。更新契约后执行 `pnpm api:types`。构建和类型检查不会联网抓取后端契约。

本轮契约增加 `POST /tags/batch` 和 `GET /tags/stats`，`GET /notes` 增加 `sort=latest|oldest|likes|favorites`。部署时先发布对应后端，再发布前端；旧版后端不支持新统计路径和排序。`/tags` 原有分页搜索保持兼容。主页修改与公开页共用展示组件，工具仅出现在 `/studio/homepage`；保存通过 `PATCH /me`，预览公开主页仍是独立页面。

字体由 `@fontsource/noto-sans-sc` 和 `@fontsource/noto-serif-sc` 本地打包，许可证为 SIL Open Font License。Lucide 图标由其包提供。`public/dot-rule.svg` 是本项目原创点阵分隔线，可运行 `node scripts/generate-dot-art.mjs` 重建。`grain.svg` 是背景噪点纹理；星系由 `src/features/discovery/galaxy-renderer.ts` 实时绘制，无外部图片素材或远程字体依赖。

