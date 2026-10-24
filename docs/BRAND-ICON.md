# 项目品牌图标

采用 2026-10-24 三版探索中的第三版：上方两条交叉曲线，下方 AI 连笔，整体借用“前”的字形，表达组内业务 AI 化转型。

## 配色与导出

- 上方双曲线：暗金 `#766342`，对应 `--gold`。
- 下方 AI：深橄榄绿 `#333A30`，对应 `--primary`。
- `public/brand/qian-ai-mark.png`：512 × 512，真实透明背景，供导航及登录／注册品牌标识使用。
- `public/favicon-32.png`：32 × 32；`public/favicon-192.png`：192 × 192。
- `public/apple-touch-icon.png`：180 × 180。
- 浏览器 favicon 按用户要求采用纯白底色 `#FFFFFF`，并在 HTML 引用中添加版本参数，促使浏览器刷新旧图标。触屏图标沿用页面底色 `#E9E9E6`。导出时保持原图比例，透明品牌图占画布宽度约 92%，favicon 约 87.5%，触屏图标约 80%。

使用内置 image_gen 修改已选定的第三版，仅调整配色、透明背景和外部留白；之后导出所需尺寸。未修改页面主题、业务功能图标或交互。

## 验证

- `pnpm build`、类型检查、格式检查及 `git diff --check` 通过。
- 四个图标资源的 HTTP 请求均返回 200，内容类型为 `image/png`，PNG 实际尺寸与 HTML 声明一致。
- 首页在 1440、768、390px 检查，登录页在 1440、390px 检查；新图标均正常显示，手机端保持原有的认证区标识隐藏行为。
- Taste inspector 首页 0 FAIL / 2 WARN，登录页 0 FAIL / 1 WARN。警告为原有大标题字号与配色检测，未涉及本次图标；页面主题和布局按现有产品设计保留。

## 最终图像提示词

```text
Use case: logo-brand.
Asset type: final website brand icon, based on the user's SELECTED THIRD design.
Input image 1 is the exact edit target. Preserve its design identity and exact stroke geometry.
Primary request: recolor the approved icon to the existing product's theme palette and remove its background.
Change ONLY colors and background: color BOTH complete upper crossing curves solid muted antique gold #766342. Color the ENTIRE lower connected AI monogram solid deep olive green #333A30. Make the surrounding background truly transparent with alpha, including the counters and all internal white spaces.
Keep unchanged: the two upper crossing shallow arcs with four open rounded ends, the lower rounded connected AI ligature, the looping A and its open triangular counter, the upright serifed I, the connecting horizontal stroke, consistent bold stroke thickness, spacing between upper and lower tiers, the overall 前-like silhouette. Do not turn I into 2, Z, or lowercase i. Do not change any curves, add or delete strokes, or add any separate letters.
Composition: single centered emblem on a square transparent canvas; preserve original silhouette proportions. Trim excess exterior whitespace so the emblem occupies approximately 84 percent of canvas width while maintaining balanced safe padding on every side.
Style: flat clean crisp vector-like branding, exact two solid colors, no shading, no textures, no gradients, no shadow, no glow, no container, no background tile, no words or labels, no mockup. Do not simulate transparency with a checkerboard. Output the isolated logo only.
```
