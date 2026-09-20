# 火焰紋章 萬縷千絲 · 完全攻略

《火焰纹章 万缕千丝》完全攻略手册 —— 多页静态站点，每日自动更新资料源。

## 站点

- 发布目录：`docs/`（Cloudflare Pages 直接指向此目录）
- 入口：`docs/index.html`（总目录），内页 `docs/p1.html` ~ `docs/p8.html`
- 纯静态、零依赖、相对链接，可离线打开

## 目录结构

```
docs/                          站点产物（发布目录）
  index.html                   总目录首页
  p1.html ~ p8.html            八个篇章
source/                        内容源
  火焰纹章万缕千丝_完全攻略手册.md   攻略正文（唯一内容源）
  _daily_log.json              每日更新 log 数据
tools/                         生成器
  build_site.py                md -> 多页站点
  site_css.py                  共用样式表
_回档/                         版本回档快照
_归档_旧版本/                   历史单页版本
```

## 构建

```bash
cd tools
python3 build_site.py \
  --src "../source/火焰纹章万缕千丝_完全攻略手册.md" \
  --log "../source/_daily_log.json" \
  --out "../docs"
```

> `build_site.py` 与 `site_css.py` 必须同目录（`site_css.py` 以模块方式被导入）。

## 每日自动更新

由自动化任务每天 09:00 执行：
1. `git clone` 本仓库
2. 检索当日攻略资料更新（社区/UGC/官方渠道）
3. 按三级可信度分类，写入 `source/_daily_log.json`，可信度高的并入正文
4. 重新构建 `docs/`
5. `git commit` + `push` → Cloudflare Pages 自动部署

## 分级标准

| 级别 | 说明 | 处理 |
|---|---|---|
| A | 一手数据、可交叉验证（官方公告、实测数据） | 可并入正文 |
| B | UGC 一手资料（NGA、Reddit、5ch 等 BBS/论坛），非标题党、无 AI 痕迹 | 至少列入第二类 |
| C | 二手转载、可信度存疑 | 仅记录，不入正文 |

## 免责声明

本仓库为玩家社群整理的攻略资料，游戏内容版权归原厂所有。
