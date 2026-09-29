# 2026-09-29 新版发布与回溯

正式站：https://fe-guide.pages.dev/

旧版页面快照：https://fe-guide.pages.dev/archive/2026-09-29-before-redesign/index.html

发布前原始提交：`35dfba9b2300efc28c4a84e720bc9b9f35e12b0b`

发布前分支：`archive/pre-redesign-2026-09-29`

`docs/archive/2026-09-29-before-redesign/` 是发布前 docs 的完整静态副本，包含当时的八篇页面、数据和美术，构建器不会重写该目录。原攻略正文与日志仍保留原路径和完整历史。旧 `p1.html` 到 `p8.html` 入站地址会跳到存档对应页面并保留原锚点。

日常维护继续编辑 `source/火焰纹章万缕千丝_完全攻略手册.md` 和 `source/_daily_log.json`，运行 `python3 tools/build_site.py`，提交生成的 docs。新版界面源文件位于 web。请勿将存档或旧生成器覆盖回 docs。

需要回退本次改版时：在 main 新建回退提交，撤销本次发布提交（git revert），检查构建结果后推送，让 Cloudflare Pages 自动发布。不要强制重置 main，以免抹掉发布后的攻略更新；存在后续内容修改时须保留这些修改再处理冲突。历史分支可用于逐文件比较和恢复。

每周清单与候选来源存于当前浏览器；原站与本地预览是不同来源，浏览器不会自动迁移这些本机记录。候选资料可在情报档案中导出 JSON。

## 手机接续与本地任务

正式站和已提交资料存于GitHub／Cloudflare，电脑离线不影响访问。当前编辑工作在本地执行；手机Remote接续需要连接该主机并维持主机在线运行。不能把关闭电脑理解为自动迁移到云端。接续时先读取CONTENT_ROADMAP.md和最新source/_daily_log.json，再从main最新提交开始；本地预览地址不能直接给手机使用。
