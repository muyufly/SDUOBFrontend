# 视觉决策与截图复核

最终方向：浅灰颗粒纸面、瑞士网格、无衬线「SDUOnline BLOG」标题、黑至淡金的三维文章星系。用户在实施中明确调整了原黑金方案，因此原来的深色背景和中间版本的书页图案不再是最终设计依据。

| 角色     | 取值                                                        |
| -------- | ----------------------------------------------------------- |
| 页面     | `#E9E9E6` + 独立 SVG 颗粒纹理                               |
| 文字     | `#292C29`，次要文字 `#62655E`                               |
| 控件主色 | `#333A30`                                                   |
| 辅助暗金 | `#766342`                                                   |
| 恒星点云 | 从黑色到淡金色的 620 个不同大小粒子，构成有透视与深度的球体 |
| 阅读区   | 浅灰 `#F5F5F2` / 暖白 `#F3F0E8`                             |

首页仅保留「SDUOnline BLOG」、学生在线的简短说明和三维星系。最新文章、我的关注移至顶部导航，写作入口集中在「我的」；全站搜索框直接输入并按回车提交。列表和区块使用点状边界，背景颗粒是静态纹理，不覆盖文字；中央恒星与文章行星则缓慢运动，可暂停。

星系采用三维坐标、透视投影、按深度绘制的 Canvas 场景。中央恒星是旋转的球形点云，每颗外围行星对应一篇公开文章。轨道使用同一平面上长短轴严格递增的椭圆，随机间距、尺寸、颜色、初始位置和周期，保证轨道不相交。拖动和方向键可改变观察角度，Home 键复位。系统减少动态效果时默认静止，仍可手动旋转。

数量来自全站公开文章接口，独立于首页筛选和分页；无文章时保留中央恒星，不虚构行星。随机种子本地保存，新增文章不改变原有轨道参数；恒星粒子不参与文章计数。

Taste Skill 固定版本：`6010f91a9935f1c167dfc500fb1a475681892e6b`；初始抽取为 True-black flat，seed `1148904737`。最终浅灰瑞士星系是按用户后续反馈进行的明确覆盖，并非重新随机抽取。细椭圆轨道、黑至淡金的点色和粒子图案均遵循用户指定方向。

最终导航版检查在 1440、768、390px 进行。Taste inspector：**0 FAIL、2 WARN**。大标题超过工作台的 32px 上限，保留用户指定的瑞士字号层级；另一个提示命中浅色文本 `#FAFAF8`，实际页面底色仍为用户指定的浅灰 `#E9E9E6`。管理/编辑页使用紧凑标题。静态 lint 对弹层阴影与焦点内描边的提示属于功能性界面提示。

## 截图评议

ROUND 1

Seen in one second: 安静的黑金阅读页。

Idea (one sentence): 给校园文字一个夜间阅读空间。

Live thing: 真实文章列表与写作入口。

Layout words by section: hero=双栏 / feed=列表 / topics=侧栏。

Scores: design 6.5 · usability 7.5 · creativity 6 · content 7 → overall 6.8

Caps applied: 无真实内容封面、文字偏小；原方向被用户反馈替代。

Top three problems (most visible first), each with the screenshot it shows in and the fix:

1. 深色底不符合新偏好：换浅灰颗粒与深色字。
2. 首页说明文字太多：去掉大段邀请文案。
3. 插画偏轻，识别度不足：重绘黑金点阵书页。

ROUND 2

Seen in one second: “记录。”和一册点阵书页。

Idea (one sentence): 把零散记录像印刷网点一样汇成一页。

Live thing: 最新/关注文章、话题和可直接进入的写作空间。

Layout words by section: hero=非对称网格 / feed=开放列表 / topics=紧凑侧栏。

Scores: design 6.5 · usability 8.2 · creativity 7 · content 7.5 → overall 7.2

Caps applied: 按技能保守评分，无真实摄影时设计分不超过 6.5；社区真实数据为空，保持诚实空状态。没有为评分填入虚构文章或额外摄影。

Top three problems (most visible first), each with the screenshot it shows in and the fix:

1. `home-390.png`：内容空时首屏只有写作入口；保留空状态，待真实文章发布自然形成列表。
2. `home-768.png`：话题区因空数据显得稀疏；缩短说明并与写作入口并排。
3. `editor-390.png`：双栏在窄屏无法阅读；使用“写作 / 预览”切换，表单纵向排列。

ROUND 3

Seen in one second: SDUOnline BLOG 和一颗黑金点云恒星。

Idea (one sentence): 站内每一篇公开文章，都成为围绕共同恒星运行的一颗行星。

Live thing: 实时文章数量驱动的三维星系，可拖动、键盘旋转与暂停。

Layout words by section: hero=文字与星系双栏 / feed=开放列表 / topics=紧凑侧栏；手机星系移至标题下方。

Scores: design 6.5 · usability 8 · creativity 7 · content 7.5 → overall 7.1

Caps applied: 保留无摄影时设计 6.5 的保守上限；「文章星系」也适用于其他写作社区，因此创意分不高估。用户要求的点云和椭圆轨道优先于技能默认装饰限制，不为评分加入无关图片。

Top three problems (most visible first), each with the screenshot it shows in and the fix:

1. `home-live-1440.jpg`：真实文章为 0，无法展示外围轨道；保持准确计数，以 `galaxy-eight-controlled-1440.png` 单独验证多行星效果，不混入真实内容。
2. `home-live-390.jpg`：手机首屏的星系占用较大；限制画布为 255px 高，标题维持两行，写作入口无需滚动即可使用。
3. `galaxy-eight-controlled-390.png`：行星和轨道在窄屏更细；保留最低行星半径、清晰数量文字及独立暂停控件，主要业务列表不依赖画布辨认。

ROUND 4

Seen in one second: 学生在线品牌下的 BLOG 与点云恒星，顶部直接进入阅读。

Idea (one sentence): 将首页作为博客的视觉入口，将阅读和写作任务分别交给导航与「我的」。

Live thing: 星系仍由真实文章总数驱动；顶部搜索、最新文章、关注和「我的」均连接实际页面。

Layout words by section: header=品牌 / 导航 / 搜索 / 账号，home=标题与星系双栏，phone=搜索与导航单独成行。

Scores: design 6.5 · usability 8.2 · creativity 7 · content 7.5 → overall 7.2

Caps applied: 无摄影，设计分保持保守上限；用户明确要求精简首页，不添加额外卡片或说明。

Top three problems (most visible first), each with the screenshot it shows in and the fix:

1. 旧版首页重复出现多个写作入口：统一放到「我的」，首页、页头和页脚均移除直接创作按钮。
2. `home-navigation-768.jpg`：一行无法同时容纳完整导航和搜索；改为两行顶部布局，手机则让搜索独占一行，不横向裁切。
3. `home-navigation-390.jpg`：搜索框在手机容易被压缩；保持全宽与 16px 输入字号，五个导航入口始终可见。

最终浏览器检查输出在 `.taste-skill/inspect-navigation/`，已逐一复核三种尺寸的首屏和全页截图。早期 ROUND 1–3 为设计过程记录。分数是内部主观复核，不是用户可用性研究或正式无障碍认证。未使用图库照片、AI 位图或第三方视觉素材；点阵分隔线与三维星系为项目原创代码。

## 主页编辑与话题发现补充复核

本轮是既有组件与工作流程调整，沿用浅灰颗粒、Noto Sans SC/Noto Serif SC 与点状分隔线，没有另抽整体风格。主页设置的问题是「这些修改在公开主页上会是什么样」；主画面直接复用个人主页，右侧只放修改工具。账号设置独立管理用户名与密码。

编辑工具按用户要求使用 78% 不透明度与背景模糊，是对技能默认不使用玻璃面板的明确例外。公开主页保留原展示和编辑入口链接，不含工具栏。平板和手机使用可收起工具，主画面始终是预览；桌面工具栏高度收紧，使保存区位于首屏内。

文章页先给出排序与筛选；话题页先呈现带真实计数位置的 Top 10 行列，再提供全部话题的搜索。示例计数只存在于受控测试，没有加入业务源码。旧式卡片、边框与字体保持现有设计，避免扩大这次改动。

截图复核：`homepage-settings-1440/768/390.png`、`homepage-tools-768/390.png`、`article-filters-1440/768/390.png`、`topics-top-ten-1440/768/390.png` 均已查看。三项明显问题及处理：桌面工具栏保存区过低（限制滚动容器高度）、小屏工具栏挤占预览（改为收起侧栏）、话题搜索可能影响 Top 10（采用独立全站统计请求）。没有横向溢出。

内部主观复核：布局 8.0、可用性 8.2、内容清晰度 8.0。未重做现有背景或卡片，不给未执行的正式可用性与无障碍审计评分。TSX 源码检查为 0 FAIL/0 WARN；访客 inspector 的线上话题请求因后端当时尚未部署而进入错误状态，该截图不作为 Top 10 成功证据，成功布局以受控截图与浏览器断言为准。

后端发布后补充真实话题页检查：`.taste-skill/tag-release-topics/` 在 1440/768/390 为 0 FAIL/0 WARN，全部首屏和全页截图均已查看。仅显式允许 palette-cream，原因是现有品牌的 #fafaf8 文本色被识别为奶油色，没有重新修改全站主题。真实榜单只有 2 个 Tag 时保留实际数量，布局与受控满榜都保持可读，不填充虚构话题。

## 控件统一与文案精简

本轮沿用已有布局与字体，收敛控件颜色：触发器 #e0e3da、菜单 #e9ebe4、选中 #d5dbcc、正文 #353d30。全部八处下拉采用同一 Radix 选择器，清除系统蓝色选项及图标置于控件外的结构；二级按钮采用同一触发器底色，主操作仍为深灰绿。

筛选从列表内展开改为 480px 宽的模态框，手机宽度两侧各留 16px，滚动时保持可操作。取消与 Esc 不应用内容，重置仅作用于本次输入。正文列表不因打开筛选产生垂直位移。

用户明确删除商铺、话题两组宣传文案，因此移除这些可见标题和描述，只保留屏幕阅读器可读的页面名称。话题榜与商铺搜索直接上移，不补充新的宣传内容。

最终三种宽度的菜单、模态框、话题与商铺实拍图见 `control-*-live-*.png`，均已查看；内部复核重点为图标边距、控件同色、选中状态、弹窗边界和键盘焦点，不再另抽全站风格。`.taste-skill/control-polish-final/` 的页面留白警告来自单篇文章时保留的页面高度，不为填充留白加入假内容。没有新增外部图片或示例业务数据。

选中态按用户后续要求统一改为直角闭合边框，去除选中下划线。主导航与分隔线至少留 8px，普通标签页至少留 10px；个人主页保留自定义强调色作为框线颜色。边框不做交叉渐变，确保切换时只有一个可见选中框。字体、颗粒背景、虚线分隔和原页面结构沿用现有设计。

## 个人主页选色补充复核

沿用既有页面结构与用户上传的封面、头像，只调整个人主页的颜色角色。按用户要求扩大强调色覆盖范围：姓名、数字、外链与交互使用可读的深色版本，资料底色使用 8% 原色，控件/标签使用 14%，悬停使用 20%。选中框继续与虚线保持距离。公开展示与编辑画布共享同一 ProfileView，选色变化即时反映，不影响站点导航与编辑工具自身颜色。

ROUND 1
Seen in one second: 封面与姓名仍是主页主体，原选色只在文章页签边框可见。
Idea (one sentence): 作者所选颜色成为个人资料与阅读路径中的共同标记。
Live thing: 设置页选色实时同步预览，归档月份可切换文章范围。
Layout words by section: 封面=全宽图片 / 资料=浅色区 / 文章=列表与归档双栏，手机归档下移。
Scores: design 7.0 · usability 8.0 · creativity 6.5 · content 8.0 → overall 7.3
Caps applied: 仅评估现有应用组件的颜色与状态，不重做整体页面，不新增图片或业务样本。
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. `profile-accent-before/desktop-fold.jpg`：选色仅出现在页签框；扩展到姓名、资料底色、数字、链接、标签和归档。
2. 首轮新底色使资料正文只有 4.2:1；将正文及统计说明调深为 #50574d。
3. 纯蓝在最深悬停底色上只有 4.13:1；降低强调文字明度上限，样本最低对比度提升到 4.70:1。

ROUND 2
Seen in one second: 封面主导，浅色资料区与同色交互形成清晰的个人主题。
Idea (one sentence): 作者选色贯穿资料与阅读交互，正文和站点框架仍保持原有中性色。
Live thing: 选色预览、文章/关于我切换和月份筛选。
Layout words by section: 沿用 ROUND 1；三种尺寸均无裁切或水平溢出。
Scores: design 7.5 · usability 8.2 · creativity 6.5 · content 8.0 → overall 7.6
Caps applied: 分数为本轮内部组件复核，不代表正式用户研究；既有虚线与颗粒背景保留。
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. 资料区选色辨识度已修正，见 `profile-accent-after/desktop-fold.jpg`。
2. 浅底上的正文对比度已修正，最终 inspector 为 0 FAIL/0 WARN。
3. 极端选色的强调文字对比度已修正，10 种样本全部达到 4.5:1；手机页签和归档方框保持完整。

最终 inspector 的六张图片及真实主页三张完整截图均已查看；不新增图库、位图或示例业务数据。

## 独立话题文章阅读

本轮在现有话题功能内新增独立文章页，沿用字体、灰绿控件、颗粒背景与方框选中态，不重新抽取视觉方向。返回全部话题、话题名称、真实文章数和排序组成页头，正文延用 NoteCard 的内容结构，但标题及封面专门放大。桌面图文左右排列，手机图片独占一行并移到正文前；无封面文章保持纯文字。

ROUND 1
Seen in one second: 话题名称先交代阅读范围，放大的文章标题和图片形成列表主体。
Idea (one sentence): Tag 成为一个可以持续阅读、分页和分享的独立话题空间。
Live thing: 按当前话题排序、分页、进入文章并返回。
Layout words by section: 页头=返回与话题名 / 工具=总数与排序 / 文章=桌面图文行、手机图片与文字纵排。
Scores: design 7.0 · usability 8.0 · creativity 6.5 · content 7.5 → overall 7.3
Caps applied: 仅评估既有应用内的阅读列表；不为真实短标题或无封面文章增加虚构内容。
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. 原话题入口进入普通文章筛选：改为 `/topics/:tag`，标题明确显示当前话题，并保留「话题」导航选中。
2. 普通列表标题和封面偏小：话题页桌面改为 28px 标题、320×208 封面，平板与手机单独调整，见 `topic-articles-live-1440/768/390.png`。
3. 桌面第一条真实文章无封面、文本很短，被 inspector 识别为留白：按纯文字文章保留，不补假图，手机不会保留封面空槽。

三种宽度的真实完整截图与 inspector 六张图均已查看；无横向溢出、0 FAIL，单条留白警告有上述数据原因。没有新增外部素材或生产示例数据。

## 公开主页入口置顶

沿用现有侧栏样式，将头像、昵称和「查看公开主页」作为最顶部的完整链接行，保留原「我的空间」标题及分组。手机导航同样放在第一项，点击即关闭菜单。昵称单行省略，文字与跳转图标各自保留空间。顶部导航最终维持五个入口、搜索及账号操作，写作继续从「我的」进入。

本轮为既有组件位置调整，未另抽风格。三个问题及处理：原主页入口位于侧栏底部（移至第一项）、手机导航缺少该入口（复用同一入口）、较长昵称可能挤压图标（文字允许收缩并省略）。`public-profile-sidebar-1440.png`、`public-profile-menu-768/390.png` 和最终 inspector 六张图均已查看，无重叠或水平溢出。内部组件复核：设计 7.5、可用性 8.0、创意 6.5、内容 7.5，综合 7.5；不代表正式用户研究。没有新增素材或生产示例数据。

## 文章附图轮播

沿用文章页的版面、现有图片和灰绿控件，将封面与附图作为正文上方的同一组图片。主画面固定 16:9，最高 420px，图片 contain 完整显示；控制条提供页数、左右按钮，缩略图以直角框表示当前选中。手机保留 44px 按钮和 48px 高缩略图，左右手势切图、上下手势滚动页面。单图不增加多余控件，正文里主动插入的图片保持原位置。

ROUND 1
Seen in one second: 标题、作者和单张主画面构成文章入口，附图不再拉长正文。
Idea (one sentence): 同一篇文章的附图集中为可逐张浏览的顶部图组。
Live thing: 按钮、缩略图、键盘和触摸切换同一组真实图片。
Layout words by section: 页头=标题与作者 / 图片=固定主画面与控制条 / 正文=原有阅读版面。
Scores: design 7.5 · usability 8.0 · creativity 6.5 · content 7.5 → overall 7.5
Caps applied: 只评估既有文章组件，不更改文章正文、素材或站点结构。
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. 用户截图中首图和其余两图分散在封面及正文后：统一为顶部轮播，见 `article-gallery-live-1440.png`。
2. 图片高宽比不同容易导致阅读位置跳动：固定画面，contain 保留完整图像，三种尺寸切换前后高度一致。
3. 手机多图切换容易与阅读滚动冲突：横向手势触发切换，保留纵向滚动与缩放；真实触摸事件验证通过，见 `article-gallery-live-390.png`。

六张真实截图和 inspector 六张图均已查看，无水平溢出或控件重叠。Inspector 的 0 FAIL/2 WARN 来自既有 38px 文章标题和阅读内容顺序，保留该结构。测试用 9 图色块只存在测试代码；未新增生产素材。

后续按用户要求取消轮播与正文的独立亮色底板，两者透明显示页面颗粒背景，正文撤去卡片内边距，左侧与图片区域对齐。暖白模式切换整页背景，避免重新形成独立色块，离开文章时由样式自动恢复常规背景。三种尺寸的普通模式、手机暖白图及最终 inspector 六张图均已查看；图片、控件与正文无重叠或水平溢出。内部组件复核仍为设计 7.5、可用性 8.0，未引入新素材或布局结构。

## 无图文章的标题封面

本轮按用户要求替换先前的无封面表现。共享文章卡始终保留同尺寸封面位置，无图时以灰绿纯色底和标题构成文字封面，不添加装饰图标、宣传文案或图片文件。文字使用已有衬线字体，根据封面尺寸调整大小，超过三行省略；列表正文仍提供完整标题链接。统计区改为固定两列，点赞与评论在不同图片状态、不同数字位数下位置一致。超窄屏让统计单独成行，给标签保留完整行宽。

ROUND 1
Seen in one second: 三篇文章使用同一图文行结构，无图文章通过标题封面获得明确的视觉位置。
Idea (one sentence): 标题本身成为无图文章的封面，并让所有文章共享同一阅读网格。
Live thing: 文字封面随文章标题渲染，点击进入同一篇文章。
Layout words by section: 普通列表=文字与右侧封面 / 话题手机=整行封面与正文 / 统计=固定列。
Scores: design 7.5 · usability 8.0 · creativity 6.5 · content 7.5 → overall 7.5
Caps applied: 只调整已有文章列表组件，沿用背景、字体和真实数据，不新增生产图片。
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. 原无图文章占满行宽，使点赞/评论右移：始终保留同尺寸封面，见 `text-covers-feed-1440.png`。
2. 数字位数及标签换行仍可能改变图标位置：统计使用固定列，标签限制在各自区域；完整数字保留在辅助标签与悬停信息。
3. `text-covers-feed-320.png` 首轮标签区域过窄：360px 以下让统计移到下一行，最终截图标签不再逐字换行。

最终 inspector 六张图均已查看，0 FAIL/0 WARN；桌面、平板、手机及 320px 无水平溢出。无需外部素材、图片生成服务或后端新字段。
