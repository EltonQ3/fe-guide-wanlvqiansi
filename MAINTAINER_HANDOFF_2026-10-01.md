# 2026-10-01 改版交接：给日常维护 agent

本文件写给负责每天维护本站、并决定是否合并 PR #3 的 agent。它说明这一轮做了什么、为什么这样做、踩过哪些坑、合并前后要检查什么，以及每项新功能今后怎么维护。

动手前先读本文件，再按惯例读 `CONTENT_ROADMAP.md` 和 `source/_daily_log.json` 最上面的几条。

## 0. 合并决策摘要

- **PR：** https://github.com/EltonQ3/fe-guide-wanlvqiansi/pull/3
- **分支：** `claude/game-guide-site-improvement-a05sw4`，在 main `ea9ba5a` 之上共 11 个提交。
  - 写本文件时 main 没有新提交，可以直接快进合并。
  - 若 main 已有每日更新，按第 6 节合并。
- **预览：**
  - Cloudflare Pages：每次推送的预览地址写在 PR 的 Cloudflare 评论里；分支别名是 https://claude-game-guide-site-impro.fe-guide.pages.dev 。
  - Workers：https://claude-game-guide-site-improvement-a05sw4-fe-guide.qbyqby212-178.workers.dev
- **检查：** `Cloudflare Pages` 与 `Workers Builds: fe-guide` 均为绿色。后者此前每次都红，已在 `1a83991` 修复，见第 2.14 节。
- **游戏资料：** 没有新增或改写游戏数据，只做了两处资料修正（2.2）。交涉物品的“取得方式”只引用既有交涉条目里已核对的句子（2.12）。
- **合并前必须决定的一件事：** 是否保留仓库连着的 Cloudflare Workers 项目。
  - 保留：合并后 `*.workers.dev` 会多一份同样的站点。
  - 不保留：在 Cloudflare 后台断开连接，并删除 `wrangler.jsonc`。
- **合并后需要站主操作：**
  - 在百度搜索资源平台与 Google Search Console 提交 `sitemap.xml`。
  - 如需中国大陆稳定访问，绑定自定义域名后用 `--base-url` 重新构建。

## 1. 背景与始终遵守的原则

这是站主一边玩一边整理的《火焰纹章 万缕千丝》攻略站。这一轮的方向是：不新增游戏资料，只把现有资料做成更好用的呈现，并修结构、可读性与视觉。

以下原则全程遵守，日常维护也应继续遵守：

1. **不补造数据：** 没有出处的结论不发布；冲突或证据不足的内容只进日志。搜索引擎摘要不算出处（理由见 3.1）。
2. **修订写日志：** 每批修改都在 `source/_daily_log.json` 最上面加一条。保持 `indent=2`、`ensure_ascii=False`，否则整份文件都会出现在 diff 里。
3. **兼顾中国大陆访问：** 不向任何第三方域名发请求，不用 Google Fonts 或公共 CDN；字体与脚本都自托管。静态页与交互页都实测过。
4. **个人状态只存在读者浏览器：** 没有服务器，不读游戏存档。所有 `localStorage` 读写都包在 try/catch 里（`load`、`save`）。键名：

   | 键名 | 内容 |
   |---|---|
   | `fe-next.planner.v1` | 招募计划 |
   | `fe-next.theme` | 外观，存纯字符串，不是 JSON |
   | `fe-next.last.v1` | 最后阅读位置 |
   | `fe-next.weekly.v1` | 每周清单 |
   | `fe-next.gamedate.v1` | 各线游戏内日期 |
   | `fe-next.candidates.v1` | 候选资料（原有） |

5. **可读性优先于装饰：**
   - 正文对比 ≥ 4.5:1，大字 ≥ 3:1。
   - 字号下限 11px（标签）、12px（说明文字），有测试守着。
   - 动效必须在 `prefers-reduced-motion` 下停住，画面外不运行。

## 2. 改动清单（按主题）

每项分为：做了什么 / 为什么 / 关键文件 / 维护时注意。

### 2.1 招募规划 `#planner`（`b5e5b2c`、`c285233`）

- **做了什么：**
  - 构建时把手册招募表解析成 `c.plan[路线]`：
    - `kind`：scout、auto、tutorial、lord 或 none；
    - `support`、`renown`；
    - `needs`：类型为 gold、item、quest、paralogue、option、story；
    - `lowest`：四线中名声门槛最低的那条。
    - 原文逐字保留在 `text`。
  - 新页面：四线门槛对照表、按本线名声筛选、「计划／已招募」标记。系统自动汇总金币、物品、任务、外传窗口与交涉选项，可复制清单。
  - 长期保存：
    - 「备份链接」把整份计划编码进网址（`#planner?restore=FW1…`）。打开后可选「导入」或「与本机合并」：同一人以「已招募」为准，名声取较高的一边。
    - 页面显示最后保存时间与是否已备份。
    - 首次标记时调用 `navigator.storage.persist()`。
- **为什么：** 一条线要打 20–40 小时，玩家会换设备、清缓存；预览站与正式站之间 `localStorage` 也不相通。海外已有多款英文四线招募工具，中文圈没有好用的。
- **关键文件：** `web/planner.js`、`tools/build_site.py`（`need()`、`recruit_plan()`）。
- **维护时注意：**
  - **角色 ID 是备份码的主键，不要改 ID**，改了旧备份就对不上。
  - 备份码格式：`FW1` + base64url(JSON `{v:1,m:{路线:[名声,[计划ID],[已招ID]]}}`)。
  - 招募表写法变了导致解析失败时，构建会报 `Unparsed recruit condition`。
  - 招募表里提到的外传必须在外传日历中存在，否则报 `Unknown paralogue in recruit table`。
  - 招募表新增需要物品的角色时，`source/trade_items.json` 必须有该物品（2.12），否则构建报错。

### 2.2 资料修正（`b5e5b2c`）

- 基罗伊卡原误用 キリーク 的图（39 号），改为 59 号（`docs/data/chars.json`）。
- 礼物表「伊奥」与招募表「伊欧」是同一人，合并为一份档案（图鉴 56 → 55 位）。
- 注意：`docs/data/chars.json` 虽然在 `docs/` 下，**却是构建的输入**，不是生成物。

### 2.3 长页结构、兵种资料与图片（`f2273d2`）

- **目录高亮：** 人物篇与攻略手册的目录随阅读位置高亮（`spy()`，IntersectionObserver）。
- **手机头部：** 目录固定在顶部、可横滑；向下阅读时页首自动收起（`html.nav-hidden`，高度写入 `--header-h`）。
- **兵种资料：** 按「基础→神将」六阶分组，配 54 个像素图标。
  - 图标由 `tools/optimize_images.py` 从 `docs/assets/icon/class/*.png` 生成 `class-sm/*.webp`。
  - 该脚本需要 Pillow，**不是构建依赖**。
  - 生成的图标与缩小后的头像都直接提交在 `docs/` 里。
- **手册列表：** `render()` 在列表前补空行。Python-Markdown 要求列表前有空行，原来有 5 处列表被渲染成一整段。只改渲染规则，正文不动。
- **头像：** 512px 原地缩为 192px，人物篇头像流量约 3.2MB → 0.5MB。原图在 git 历史与 `docs/archive`。

### 2.4 可读性（`d42aa74`）

- **实测：** 13 个页面中，原有 29% 的文字小于 12px，现约 5%；金色小标对比原为 2.6:1。
- **字号下限：** `small{font-size:max(11px,.85em)}`，测试 `test_text_size_floor` 守着。
- **颜色：** `--muted:#5a6066`、`--gold-ink:#7a5d2c`，在浅底上 ≥ 4.5:1。`--gold` 只用于线条、底色与深色区块。
- **其他：**
  - 标题用 `text-wrap: balance`，段落用 `pretty`；手机点击区加大。
  - Windows 标题字体不退回 SimSun。
  - 角色卡标签改为「所属篇章／几线可挖·最低名声」。

### 2.5 深色模式（`083b582`）

- **做了什么：**
  - 页首按钮在「跟随系统／浅色／深色」间切换。
  - `index.html` 的内联脚本在样式载入前设置 `<html data-mode>`，避免闪白。
  - 打印永远用浅色。
- **怎么实现：**
  - `tools/dark_css.py` 在构建时从 `web/styles.css` 推导深色样式，附在 `docs/styles.css` 末尾。
  - 所有带颜色的声明按**原顺序、原 media query** 镜像到 `:root[data-mode=dark]` 下，所以层叠结果与浅色一致。
  - 转换规则（OKLCH）：浅底转深底，卡片略亮于页面；深字转浅字；强调色填充与原本就是深色的区块不变；`var()` 先解析成实值再判断。
  - 需要人工判断的少数规则写在 `web/dark.css`。
- **维护时注意：** 平时只改 `web/styles.css`，深色会自动跟上。哪里在深色下看不清，就在 `web/dark.css` 补一条，不要去改生成结果。

### 2.6 西文字体（`083b582`）

- 自托管 Libre Caslon Text 拉丁子集（400、400 italic、700），每个字重约 25KB，SIL OFL，许可在 `web/assets/fonts/`。
- `unicode-range` 排除了 ——、引号与 ·，这些符号仍用中文字体，避免中西混排断裂。
- 出处已写入 `source/asset-credits.md`。

### 2.7 首页（`083b582`）

- **回访者：** 先看到「继续阅读」（`fe-next.last.v1`）、招募计划、本周进度与「外传提醒」。
- **初访者：** 看到「三步上手」。
- **其余结构：** 路线按原手册建议顺序排列（凯伊→赛奥朵拉→迪托利希→蕾达）；其后是常用工具、系统手册、最近更新；去掉了重复的主角栏。

### 2.8 外传日期提醒与「接取窗口一览」（`d63cc53`、`deeefd2`）

- **日期提醒：**
  - 人物篇外传日历可填本线的游戏内日期，按路线分别保存。
  - 每篇外传标出「可接／今明截止／几天后开放／只剩完成期限／已过」；首页「外传提醒」列出各线最紧迫的几篇。
- **接取窗口一览（`paralogueGantt`）：**
  - 每篇外传一行：实线为接取窗口；虚线画到完成期限，只在来源给出期限时出现。
  - 同一外传再次开放（如塔利穆恩）时，虚线在下一个窗口前截止。
  - 有日期时画「今天」线；点名字跳到该外传卡片。
- **规则：** 只读已收录的窗口与期限。来源未单列完成期限的外传，窗口过后显示「本线接取窗口已过」，**不推定期限**。日期按非闰年计算。
- **关键文件：** `web/reference.js`（`paralogueState`、`paralogueLabel`、`paralogueDigest`、`paralogueGantt`、`renderGameDate`）、`web/app.js`（`homeParalogueAlerts`）。

### 2.9 静态页面与搜索收录（`d63cc53`）

- **为什么：** 交互版是 hash 路由的单页，百度等不执行脚本的爬虫与聊天软件的链接预览只看到空页。这是 README 原列的第 5 优先项。
- **做了什么：**
  - `tools/static_pages.py` 在构建时生成 69 页：`guide/`、`route/`、`character/`、`classes.html`、`directory.html`；另有 `sitemap.xml`、`robots.txt`。
  - 每页有 canonical、描述与 Open Graph 标签，链接回对应的交互页面；人名链接到角色静态页。
  - 内容与交互版同源，不另写文案。
  - 交互版页脚与 `<noscript>` 都链接到 `directory.html`。
- **维护时注意：**
  - canonical、`og:url` 与 sitemap 用**不带 `.html`** 的地址，因为 Cloudflare Pages 会把 `/x.html` 重定向到 `/x`。
  - 站内相对链接保留 `.html`，本机 `python3 -m http.server` 也能打开。
  - 正式域名默认 `https://fe-guide.pages.dev`。换域名用 `python3 tools/build_site.py --base-url https://新域名`。
  - 手册 HTML 里若出现 `src="assets/…"`，静态页会自动改成 `../assets/…`（2.13 的血印图标靠这个）。新增其他相对资源时注意子目录路径。
  - Cloudflare Pages 的预览部署默认带 `noindex`。

### 2.10 「命运丝线」与页面淡入淡出（`87a56ad`、`deeefd2`、`cc05a02`）

- **首页（`web/weave.js`）：**
  - Canvas 2D 背景：细丝像织布机经线缓缓飘动。
  - 四位主角的彩线在左侧分开，沿立绘底部编成一股，穿插于卡片前后，对应首页原有的「FOUR PATHS. ONE INTERWOVEN DESTINY.」。颜色取自立绘底色（`weaveColors`）。
  - 鼠标拨动丝线；指向主角或键盘聚焦时，对应的线亮起。
- **人物篇：** 顶部用本线的 `--route-glow` 与 `--route-gold` 两股线编织。
- **易读与性能约束（改动丝线时必须保持）：**
  - 文字下方用模糊遮罩抹掉约 92% 的丝线。首页任一线高亮时正文最差对比 6.4:1；人物篇有无丝线的对比相同。
  - `prefers-reduced-motion` 时只画一帧静止画面。
  - 画面外、后台分页或离开页面即停止绘制，来回切页只有一个绘制循环。
  - 4 倍 CPU 降速的手机模拟下维持 60fps；约 3KB gzip，无外部库。
- **手机版面：** 手机上丝线走在按钮与立绘之间的留白里。
  - 首页 `≤580px` 时 `.hero-art{margin-top:30px}`；人物篇 `≤700px` 时 `.campaign-pilot .route-hero-art{margin-top:24px}`。
  - 改首页或人物篇顶部排版后，要复查丝线是否被立绘盖住（见 3.5）。
- **页面切换：** `navigate()` → `renderView()`，支持时用 `document.startViewTransition` 淡入淡出。页首不参与动画；首次载入与减少动态效果时直接切换。**打开的弹窗在切换前关闭**（见 3.5）。
- **人物篇顶部光晕：** 原来落在文字后方，手机正文对比约 4:1，已移到立绘后方，现手机 ≥ 6.8:1、桌面 ≥ 5.1:1。

### 2.11 兵种、来源目录等小项

- 来源目录按站点分组。
- 导航新增「兵种资料」。
- 兵种详情弹窗带图标。

### 2.12 交涉物品「去哪里找」（`deeefd2`；站主列为必要）

- **数据：** `source/trade_items.json` 覆盖招募表需要的 13 种物品。
  - `verified`：已核对的取得方式。**文字必须逐字引自 `negotiations.json` 同一出处的句子**，测试会检查；`unitPrice` 必须与文字里的价格一致。
  - `pages`：该物品的专门攻略页，只作“去哪里查”的链接，不代表本站已核对其内容。
  - `leads`：搜索摘要线索。构建不读取，页面不显示，测试保证不会进入 `docs/data.js`。
  - `shopTips`：手册里关于商店补货、按 ZL 查看库存的两句提示，链接回原文小节。
- **显示：**
  - 招募规划的物品清单显示取得方式与攻略页链接，并按已核对标价估算物品花费，注明不含折扣与未核对物品。
  - 角色档案和角色静态页显示同一块；交涉说明里已出现的句子不重复。
- **现状：**
  - 已核对 5 项：グルマオサ（流动商人 5000G／个）、カガヤキウオ（ブロンテス湖探索）、圣水（商店 500G／个）、铁弓（武器屋或商人现货）、法比奥的合适武器（已知成功例）。
  - 待核对 8 项：巨人肉、砂虫肉、コーシャルーガー、椰枣、铁剑、铁枪、铁斧、青铜斧；另有铁弓的价格。
- **核对流程：**
  1. 打开 `leads` 里的原页逐条确认。
  2. 先把确认的结论写进 `negotiations.json` 的 details 并附出处。
  3. 再在 `verified` 里逐字引用。
  - 武器价格可能因城镇与折扣不同，核对时记录城镇名，不要只记一个数字。
- **为什么只发布已核对内容：** 本轮运行环境打不开任何攻略站，只能拿到搜索摘要，而摘要已有明显错误（3.1）。

### 2.13 血印卡片（`2ae7388`）

- 手册 5.8 的血印表在构建时改为卡片（`crest_cards`，`tools/build_site.py`），用站内原有的 10 个图标（`docs/assets/icon/crest/`）。
- 每张卡显示发动率、效果与持有者，文字与原表逐字相同。
- 若表格改名或图标缺失，自动退回原表格。
- 深色模式下提亮图标（`web/dark.css`）。

### 2.14 修复 `Workers Builds: fe-guide`（`1a83991`）

- **原因：** 仓库除了 Cloudflare Pages，还连着一个 Cloudflare Workers 项目。它默认的 `wrangler deploy` 找不到配置、Worker 脚本或资源目录，每次报 “Missing entry-point to Worker script or to assets directory”（已用 Wrangler 4 在本机重现）。
- **修复：**
  - 根目录 `wrangler.jsonc` 把同一个 `docs/` 当静态资源发布，`name` 必须是 `fe-guide`，与 Cloudflare 上的 Worker 同名。
  - `wrangler deploy --dry-run` 通过。
  - Pages 忽略此文件，因为它没有 `pages_build_output_dir`；之后 Pages 检查仍成功。
- **影响：** 合并后 `*.workers.dev` 会多一份同样的站点。各页 canonical 仍指向 pages.dev，不会抢收录。站点本身仍不需要 npm。

## 3. 踩过的坑（请先读这一节）

### 3.1 环境与资料来源

- **网络白名单：** 本轮运行环境（Claude Code 云端容器）的网络策略只放行少数域名。GameWith、Game8、Altema、AlGest、个人博客、腾讯文档、B 站 wiki、Fire Emblem Wiki、`*.pages.dev` 全部被挡。
  - 站主本机环境能访问 AlGest 等站（手册附录有记录）。
  - 需要核对时，要么在能联网的环境做，要么请站主在云端环境设置的 Network access 里加入相应域名。
- **搜索摘要不可信：** 摘要中出现过：
  - 把游戏名写成其他作品；
  - 基罗伊卡的支援／名声门槛与本站招募表不一致；
  - 同一物品价格前后不一。
  - 所以摘要只能当线索存进 `leads`，**不能发布**。
- **环境依赖：** 构建需要 Python 的 `markdown` 包（`requirements.txt`）。新环境先 `pip install -r requirements.txt`。

### 3.2 单页路由与版面

- **页内锚点：** 交互版用 hash 路由，页内跳转**不能用 `<a href="#某id">`**，会被路由当成页面切换。要用 `<button data-scroll="id">`，现有统一处理。外传时间轴的跳转也用这个机制。
- **手机滚动偏移：** `html{scroll-padding-top:100px}` 让手机跳转偏移 100px，已在 ≤800px 设为 0。
- **头部换行：** 801px 左右页首「搜索」字样换行，已在 801–1000px 隐藏文字。
- **角色卡对齐：** 网格里图片高低不齐，已加 `align-items:start`。
- **触屏悬停：** hover 位移在触屏上会卡住，悬停效果都包在 `@media(hover:hover)`。
- **样式优先级：** `.planner-summary li small`（紫色，外传窗口用）的优先级高于新加的单类选择器。新样式在规划器里不生效时，先查这条。

### 3.3 深色模式生成器

以下问题都已修，但改 `tools/dark_css.py` 时要记住：

- 颜色正则曾把 `var(--white)` 里的 `white` 当成颜色，已加前后断言。
- 镜像规则曾按颜色分组输出，打乱了层叠，现在按源码顺序输出。
- 只含 `var()` 的声明曾不镜像，导致弱选择器的镜像值盖过强选择器，现在所有带颜色的声明都镜像。
- 金色按钮上的文字曾被反成浅色，现在先解析 `var()` 判断是否为浅色填充。
- 无背景的 `<button>` 会显示浏览器默认的浅灰底（ButtonFace），已在 `dark.css` 给深色底。
- 「绝对距离」映射会让「比页面暗的嵌入块」与「比页面亮的卡片」在深色下几乎同色。外传窗口块、日期面板已在 `dark.css` 提亮一阶，新加嵌入块时留意。
- `main img:not(.class-icon)` 的深色调暗规则优先级很高；要给某类图片单独设置滤镜时，用 `main img.某类`，并放在其后。

### 3.4 可读性审查

- 浏览器默认 `<small>` 只有约 10px，已设下限。
- **基于计算样式的对比审查会漏掉渐变和图片背景。** 人物篇顶部光晕压在文字后方就是这样漏掉的，后来改为“隐藏文字后对截图逐像素取最亮背景”才发现。动到大图、渐变区块时，用像素取样复查。
- 浅色模式审查里剩下的几项都是早已存在的接近值（约 4.49:1 的少数链接、`expand-mark` 4.17:1），以及规划器 S／R 之间装饰性的「／」（1.76:1），本轮没有处理。

### 3.5 动效与真机

- **丝线被立绘盖住：** 手机上丝线的位置原本取「含内距的文字区底部」与立绘顶部的中点，结果中心只比立绘高 4px。我在 390px 截图里没看出来，是站主用手机预览发现的。
  - 教训一：版面相关的动效要**用数字量位置**（例如逐列扫画布像素，确认丝线与按钮、立绘的间距），不要只看截图。
  - 教训二：交付前请站主或测试者用真机看。
- **淡入淡出与弹窗：** 页面淡入淡出的渲染改成异步后，打开的角色弹窗一度在切页后仍开着（冒烟测试抓到）。弹窗必须在 `startViewTransition` 之前关闭。
- **Canvas 生命周期：** 用 IntersectionObserver、visibilitychange 和 `canvas.isConnected` 管理，离开页面自动清理。新增动效照此处理，不要留下常驻的 `requestAnimationFrame`。

### 3.6 静态页与部署

- **`.html` 重定向：** Cloudflare Pages 会把 `/x.html` 重定向到 `/x`。canonical 若写 `.html`，就会指向一个重定向。
- **子目录路径：** 静态页在 `guide/` 等子目录下，手册 HTML 里的相对路径需要加 `../`，否则图片 404。站内链接与图片是否存在，有测试守着。
- **Workers 红灯：** 曾长期以为“只能在 Cloudflare 后台处理”，其实本机用 `npx wrangler deploy --dry-run` 就能重现并验证。遇到外部 CI 失败，先尝试本机重现。

### 3.7 数据、日志与测试

- **日志格式：** 改 `_daily_log.json` 时要用原格式写回（`indent=2`、`ensure_ascii=False`、结尾换行），否则 diff 变成整份文件。
- **同日多条日志：** 同一天有多条日志时，`tests/test_data.py` 里取 10-01 日志的测试改为**按 edition 选取**。今后同日新增条目时注意这类测试。
- **`research/` 被 .gitignore 忽略：** 放在那里的东西不会提交，所以物品线索放在 `source/trade_items.json` 的 `leads`。
- **Python 版本：** Python 3.11 不允许 f-string 里嵌套同种引号，不要靠 `chr()` 之类的写法绕过，拆成变量或小函数。
- **构建输出：** `python3 tools/build_site.py | head` 会因管道关闭（BrokenPipe）中断后续步骤，没有复制 `source/guide.md` 和旧版 `p1–p8.html` 跳转页。看构建输出时不要接 `head`。
- **测试桩：** Node 测试用 `vm` 跑 `web/*.js`，桩对象只实现了用到的 DOM 方法。新代码用了 `focus()`、`closest()`、`TextEncoder` 这类 API 时，需要在测试桩里补上。
- **截图目录：** 截图脚本不要在仓库根目录运行，曾经产生过多余的 `shots/` 目录。
- **外观键值：** `fe-next.theme` 存纯字符串（`light`、`dark`、`auto`），测试脚本里用 JSON 存会失效。

## 4. 设计考量与取舍

- **呈现而非新增：** 这一轮所有功能都只用站内已有资料：规划器解析既有招募表，时间轴读既有外传日历，静态页用同一份数据生成，血印卡片用原表与原有图标。这样不增加核对负担，也不会出现两份资料不一致。
- **长期保存不靠服务器：** 规划器的数据只在读者浏览器里，用备份链接解决换设备问题。没有账号、没有后端，符合「站点运行不需要服务器」的原则。
- **深色模式靠推导：** 手写一整套深色样式，以后每改一处浅色都要同步。推导方案只需维护少量例外（`web/dark.css`），代价是罕见状态（各种弹窗内容、错误提示）可能有配色瑕疵，发现后补例外即可。
- **动效的选择：** 站主问过能否用 three.js、canvas、Remotion。
  - three.js 自托管至少 150KB，还会让手机 GPU 发热，而首屏正是读者最快滑过的地方，不值得。
  - Remotion 是生成视频的工具，适合做导流短片，不适合放进网站。
  - 选 Canvas 2D：约 3KB，主题与「万缕千丝」的名字直接相关，并且严格服从可读性约束（2.10）。
- **数据可视化优先于装饰：** 外传时间轴、血印卡片、规划器的汇总，都是“好看且帮助理解”的改动。之后的视觉改动也建议先找这种机会。
- **静态页而非整站改造：** 把 hash 路由改成多页应用的代价太大；改为额外生成同源静态页，同时解决收录与链接预览，交互版不动。
- **只发布已核对内容：** 交涉物品宁可显示「本站尚未核对」并给出攻略页链接，也不发布摘要。站主的资料纪律比完整度重要。
- **剧透分级：** 站主决定第一部不需要；第二、三部目前没有涉及细节剧情的内容，日后加入细节时再做。

## 5. 验证方法

```sh
pip install -r requirements.txt           # 新环境先装 markdown
python3 tools/build_site.py               # 生成 docs/（不要接 | head）
python3 -m unittest discover -s tests     # 21 项
for f in tests/*.cjs; do node "$f"; done  # 4 个文件
npx wrangler deploy --dry-run             # 可选：确认 Workers 配置
```

- 测试覆盖：资料不丢失、招募表解析、外传窗口与日期状态、外传时间轴、规划器（标记、备份、合并、物品来源与花费）、首页、字号下限、深色生成、静态页、交涉物品可追溯、血印卡片。
- 本轮另用 Playwright 做过冒烟与审查，脚本没有提交进仓库：13 个交互页（390／900／1366px）与 5 类静态页（390／1366px），浅色与深色都看过，检查脚本错误、横向溢出、深色对比、第三方请求、弹窗与页面切换。若维护时需要，可以把这类脚本整理进 `tools/`。

## 6. 合并步骤与注意

1. **main 没动过：** 直接合并或快进。
2. **main 有新的每日更新：**
   - 把 main **merge** 进分支，不要 rebase。
   - 手动解决 `source/`、`tests/`、`web/`、`tools/` 的冲突。
   - `_daily_log.json`：两边都在顶部插入条目，两边都保留，按日期新到旧排列。
   - `docs/` 下的生成文件（`data.js`、`styles.css`、`index.html`、静态页、`sitemap.xml`）**不要手工合并**，任取一边后运行 `python3 tools/build_site.py` 重新生成。
   - 最后跑第 5 节的全部测试。
3. **合并前看预览：**
   - 真机：iOS、Android，以及 Windows 上的中文字体。容器里没有宋体、雅黑、苹方，字体效果只在真机上准。
   - 深色模式下打开几个弹窗。
   - 规划器导入、导出备份。
4. **决定是否保留 Workers 项目**（第 0 节）。
5. **合并后：**
   - Cloudflare Pages 会自动发布正式站。
   - 若站主还没提交 sitemap，提醒站主操作。
   - 回退方法见 `RELEASE_AND_ROLLBACK.md`：revert 合并提交，不要强推 main。

## 7. 日常维护速查

| 想改什么 | 改哪里 | 守护 |
|---|---|---|
| 攻略正文、招募表 | `source/火焰纹章万缕千丝_完全攻略手册.md` | 解析失败时构建报错；`test_recruit_plan_mirrors_table` |
| 交涉明细 | `source/negotiations.json` | `trade_items` 的 `verified` 要逐字引用这里 |
| 物品取得方式 | `source/trade_items.json` | `test_trade_items_publish_only_checked_findings` |
| 外传窗口与期限 | `source/paralogues.json` | `tests/test_reference.cjs` |
| 人物篇内容 | `source/story.json` | `tests/test_campaign.cjs` 等 |
| 角色立绘、别名 | `docs/data/chars.json`（构建输入） | `test_art_and_alias_corrections` |
| 样式 | `web/styles.css`；深色例外写 `web/dark.css` | `test_text_size_floor`、`test_dark_theme_is_generated` |
| 交互逻辑 | `web/*.js` | `tests/*.cjs` |
| 静态页 | `tools/static_pages.py` | `test_static_pages_for_search` |
| 修订记录 | `source/_daily_log.json`（顶部插入） | 日志相关测试 |

**不要直接改 `docs/` 下的生成文件**，改了也会被下一次构建覆盖。例外：`docs/data/chars.json` 是构建输入；`docs/assets/` 里的图片与图标是提交的素材；`docs/archive/` 是旧版快照，构建不会重写。

## 8. 待办与已知限制

- **交涉物品：** 8 项取得方式与铁弓价格待核对（2.12），需要能访问攻略站的环境。
- **字体：** 尚未在 Mac、Windows、iOS 真机上确认中文字体效果。
- **深色模式：** 罕见状态的配色可能有瑕疵，修正位置是 `web/dark.css`。
- **`.html` 重定向：** 依据 Cloudflare 文档，本轮环境打不开 pages.dev，未直接实测；就算不重定向，无扩展名地址也能打开，canonical 不受影响。
- **外传日期：** 按非闰年计算。目前窗口都在 9–11 月，不受影响；若有 2 月的窗口，需要确认游戏内年份。
- **人物篇篇幅：** 若继续加长，可考虑把名声金字塔与外传日历改为篇内分页或默认折叠。
- **其他候选：**
  - 角色图鉴的「按派系／本线可挖」分组视图；
  - 第二、三部的地图或流程示意图；
  - 用 `--base-url` 配合自定义域名，改善中国大陆访问。
