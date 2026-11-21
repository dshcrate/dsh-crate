# 上游同步规则

上游仓库：`dsh-market/dsh-market`
本地仓库：`dshcrate/dsh-crate`（远端 `origin`）

原则：**不整包 merge，不照抄版本号，只按提交搬需要的东西。**

触发同步的三种情况，除此之外不动：

1. 宿主 `dsh` 升级导致 API 不兼容
2. 上游修了我们需要的 bug（安装、滚动、吸顶、图标、升级链路等）
3. 上游发布安全修复

## 固定动作

```bash
# 1. 拉取上游标签
git fetch upstream --tags

# 2. 看两个版本之间改了什么
git log --oneline --no-merges v1.73.16..v1.73.17
git diff --stat v1.73.16..v1.73.17

# 3. 判断单个提交的改动面
git show --stat <sha>

# 4. 只搬需要的提交（冲突时手工合并，禁止 --theirs 整段覆盖）
git cherry-pick <sha>

# 5. 三道门
npm test
npm run typecheck
npm run build:client
```

`npm test` 会跑 `tests/brand-guard.spec.ts`，品牌、数据源、三语文案、视觉几何共 32 项断言，任何一项红都说明同步把本地定制覆盖了。

## 分类与处理

| 上游改动类型 | 处理方式 |
|---|---|
| 宿主 API 兼容、启动崩溃、安装/升级逻辑 | 必须跟，优先 cherry-pick |
| 插件页 / 设置页 bugfix | 跟，但落到本地定制 UI 上手动适配 |
| 纯品牌、文案、发布脚本、版本号、README | 跳过 |
| 大范围重命名 / 重构（包名、namespace 批量替换） | 不整段照抄，只提取功能点重写 |

## 文件边界

| 路径 | 策略 |
|---|---|
| `src/`（`src/client/` 除外） | 可以直接搬 |
| `src/client/` | 本地定制 UI，**不整体覆盖**；只手工移植单个修复 |
| `src/client/locales.ts` | 三语文案与品牌措辞，任何覆盖都要人工核对 |
| `client/client.js` | 构建产物，搬完源码后跑 `npm run build:client` 重建 |
| `locale/*.json` | 插件元信息，保留本地描述 |
| `package.json` | 保留 `name: dsh-crate`、`version: 0.5.x`、`icon`、`repository`、`files` |

## 保护机制

目的：上游同步时，凡本地定制一律不自动覆盖；被覆盖时测试立即变红，不靠肉眼检查。

### 保护清单 `sync/protected.json`

列出禁止整文件覆盖的路径，字段为 `path` / `why` / `merge`。同步脚本读取该文件；命中的文件只输出 diff，不写盘，由人工逐块合并。

覆盖范围：数据源地址、插件身份与自识别集合、三语文案、插件端界面、滚动与吸顶样式、导航图标、构建产物、插件元信息、包身份、logo。

### 防护断言

`tests/brand-guard.spec.ts` 共 29 项，随 `npm test` 运行：

| 组 | 覆盖内容 | 数量 |
|---|---|---|
| A | 身份与升级 | 9 |
| B | 数据源 | 1 |
| C | 品牌文案 | 9 |
| D | 视觉与几何 | 4 |
| E | 设置页布局与滚动（吸顶与背景色、无内层滚动、吸顶变量） | 3 |
| F | 导航图标（行选择器、尺寸与掩膜、标记与清除） | 3 |

上游同步后若 E/F 变红，说明设置页吸顶、导航背景色或图标定制被覆盖，按清单恢复后再提交。

## 已知坑

- 上游和本地都改过的文件（`locales.ts`、`MarketSection.tsx`、`client.js`）cherry-pick 必冲突，必须逐块手工合并
- 上游版本号是 `1.73.x`，本地是 `0.5.x`；不要引入上游版本号、tag、包名
- 上游的品牌字符串（`dsh-market`、`Plugin Market`、`插件市场`）不能进入 `src/client` 与 `locale`
- v1.74.0 起上游文案改用通用词，品牌回写还要覆盖 `plugin market`（小写）、`プラグインマーケット`、`dsh-plugin-catalog` 索引地址与 `plugin_market` 工具名；`locales.ts` 直接以本地 HEAD 为准、只补上游新增键，比逐条改文案稳
- 品牌统一后，上游测试里的包名 `dshmarket` 与头部仓库链接文字都会变成 `dsh-crate`，`queryByText('dsh-crate')` 这类整屏断言会误命中链接；改用 `queryByTitle('dsh-crate')` 或限定行元素
- `src/client/sponsors.generated.ts` 已纳入保护清单；同步后仍要确认 `SHOW_SPONSORS=false` 还在，且 `client.js` 里没有 `qiniu` 等赞助商数据
- 上游的 registry / catalog 源地址不能覆盖 `src/regions.ts` 里的 `CATALOG_OFFICIAL`
- 插件页整页滚动和底部 64px 跟随上游，不是本地定制；同步时不要回贴，也不要为它们单独改断言
- 品牌回写必须在**所有合并完成后**统一再跑一遍：合并会把上游新片段带进 `src`/`tests`/`locale`，合并前替换会漏；CSS 里的 `data-dsh-market-*` 属性名是最容易漏的点（2026-11-19 漏了两条吸顶规则）
- 替换后要修语法：对象键 `{ dsh-crate: … }` 加引号，属性访问 `x.dsh-crate` 改成 `x['dsh-crate']`
- 构建产物也要查：`client/client.js` 中上游品牌必须为 0，`lib/registry.js` 必须含 `parseCatalog`；再用 `lib/registry.js` 的 `loadRegistry()` 真实加载一次线上目录，确认 `entries` 桥接可用
- 非保护文件按文件清单 checkout，不要 `git checkout <tag> -- tests` 整目录覆盖，否则会冲掉本地定制测试（品牌防护、滚动、图标、拓扑适配）

## 同步记录

| 日期 | 上游范围 | 采纳提交 | 本地提交 | 跳过项与原因 |
|---|---|---|---|---|
| 2026-11-07 | v1.73.7 → v1.73.14 | 服务端与界面层整批（`cd92fa0`、`d6a4680`） | `ff4d0e7`、`fb490bd`、`f31dcd2` | 上游品牌与版本号，未采纳 |
| 2026-11-07 | 同步后修复 | — | `d9eb738`、`004e363`、`0a6101f` | 文案被覆盖，补 e2e 断言与品牌防护 |
| 2026-11-08 | v1.73.14 → v1.73.15 | `588b0cf`（#1140 状态 busy 与队列静默）、`4241cc9`（#1134 drain 空转）、`c798139`（#1137 bundle 已挂载包不再套 shim）、`6b946f6`（#1136 恢复补丁先写临时文件）、`d5b5271`（#1135 用户补丁 UTF-8 BOM） | `892c4fa` | `ed92edf`（仅版本号）；新增品牌串已改写为 `dsh-shelfry` |
| 2026-11-09 | v1.73.15 → v1.73.16 | `7b1e1d8`（#1148 raw 声明走地区线路并重试）、`f1d8ffa`（部分版本区间解析）、`c85abec`（Release 归档 URL 识别为目录身份）、`e937554`（#1102 热挂载失败原因分类）、`f529980`（#1144 测试固定 region）、`ecc35a8`（#1134 drain 有界性测试） | `1877b00` | `3616c43`（仅版本号）；新增测试串已改写为 `dsh-crate` |
| 2026-11-10 | v1.73.16 → v1.73.17 | `1e86641`（#1146 .asar 内 CLI 继承启动器 cwd）、`0c34344`（#1154 origin fence 信任监听地址）、`ab8ede5`（启动重放期间保持载体 gate）、`e30ea78`（市场页避免每次渲染重扫目录）、`211cd9d`（#1156 pnpm 12 折行报错识别被拦构建脚本）、`2ee6600`（#1161 稳定版不推荐预发布）、`ed32903`（#1151 宿主重载互等与断线重连）、`cf37fd1`（#1158 载体 gate 自愈守卫） | `4317992` | `12f2d71`（client.js 重建，本地自行构建）、`f76b5f5`（仅版本号）；测试路径串改写为 `dsh-crate` |
| 2026-11-12 | v1.73.17 → v1.73.19 | `3e8249d`（发布等待期只在必要时提示）、`4ad7295`（带版本号的 Release 归档名识别）、`a36b3ab`（#1164 按包名清移除提示）、`ddf269d`（verify 点名预设）、`1e80e61`（#1097 屏蔽表为空跳过整份目录匹配）、`b5bedf4`（#1137 安装目录下 bundle 的热挂载）、`2a59625`（#1056 卸载中轮询状态）、`a5e6e6e`（#1167 停止运行文案）、`0115789`（#1168/#1144 插件 Config schema）、`320c98c`（#1169/#1129 分组全部收起/展开）、`3db619a`（宿主核心包写成普通 dependency 的兼容判定）、`1b8dd27`（#244/#715 pnpm store 重连建议）、`3003487`（#1175 保留 `disabled: !!js`）、`6b68de4`（宿主重载时安装不算失败）、`0642760`（#1172 lockstep 依赖判定）、`b707b7d`、`3fc4a65`（测试补齐）、`7edf0ef`（#1151 完成态不被卸载改写）、`664c0fa`、`d9b8135`（#1150 补丁状态判定）、`0094745`（#1170 缓存容量）、`19d9c22`（#1103 中止提示）、`f27305b`（#1093 清理 minimumReleaseAgeExclude） | `66b47b5` | 8 个纯站点提交（本仓无 `site/`、`scripts/site-*`）、`7f32bb6`/`da77482`（仅版本号）；新增测试里的 `/dsh-market/`、`.dsh-market`、`dshmarket` 改写为 `dsh-crate`，`client.js` 本地重建 |
| 2026-11-16 | v1.73.19 → v1.73.20 | 服务端热挂载/发现/安装/更新/patch/CLI 整批；客户端背景更新检查、安装时间、更新提示；测试同步（52 提交） | 本次提交 | 2 个站点截图、3 个文档截图、1 个仓库清理、1 个版本号；品牌串改写为 `dsh-crate`，`client.js` 本地重建 |
| 2026-11-19 | v1.73.20 → v1.73.22 | 45 个功能/修复提交：设置页市场迁移提示（SettingsNotice）、更新批量重启与 release blocker、收藏移除、自更新可用时间、导出与更新状态 i18n、Release 归档描述、排序偏好、启动修复报告、release history、registry 并发请求合并；依赖 `undici ^7.30.2` | 本次提交 | README/站点/文档/演示截图/站点构建脚本（本仓无 `site/` 发布链路）、两个版本号提交；保护文件逐块合并，`registry.ts` 保留 `entries` 桥接，品牌串改写为 `dsh-crate`，`client.js` 本地重建 |
| 2026-11-20 | v1.73.22 → v1.73.24 | MarketSection 组件拆分重构（`dac32de`、`5e5a8b6`、`f716b32`、`16976f8`）、启动修复收尾 remove-then-install（`bdfa1c3`）、scoped 包逐个判定（`6a7a02d`）、WebDAV 记住密码（`c866d50`）、搜索同义词与排序（`2328396`、`ce59e0c`）、赞助商换行（`f9e516f`）、匿名遥测（`bbe6e25`、`9aaff8e`，本地改为默认开启） | `d74e132`（同步）、`c51d68a`（legacy 清理）、`7fe9c77`（默认开启） | README/站点/`SECURITY.md`、`telemetry/` 上游服务端、`package-lock.json`、版本号提交；保护文件逐块合并并回贴箱子 logo、设置页吸顶；品牌串改写为 `dsh-crate`，遥测 URL 改为 `https://dshcrate.com/api/telemetry`、状态目录 `dsh-crate`，`client.js` 本地重建 |
| 2026-11-20 | v1.73.24 → v1.73.25 | `71d3dfc`（当天打开页面额外上报 `opened:true`、`lastOpenDay`、`/telemetry/opened`）；`d0967c7` 仅版本号跳过 | `a754937`（插件）、`df5f032`（测试 stub）、`03174c7`（站点服务端与看板） | `e6a2b4b` README 商务合作、上游站点隐私页、版本号；D1 增加 `opened` 列，Pages Function 与看板同步 |
| 2026-11-21 | v1.73.25 → v1.74.0（含 `fb38e08`、`a05f16d`） | `196ace9`（紧凑头部、卡片标题进详情、两行卡片元信息、最近收录翻页箭头）、`b05db65`（赞助商华龙算力）、`9aeab86`（收藏/主题/隐藏页目录重试）、`b9438a7`（发布等待期只标注被拦的更新）、`fb38e08`（测试先打开已安装页）、`a05f16d`（搜索框 × 保留焦点） | 本次提交 | 版本号 `4c5b8f6`/`76f4132`、README 与站点截图 `899c0f8`/`acad04b`/`e6a2b4b`；保护文件逐块合并，设置页吸顶与箱子 logo 回贴，`locales.ts` 回到本地 HEAD 再补新键，赞助商默认关闭，品牌串与测试断言同步修正，`client.js` 本地重建 |

新的同步完成后，在表里追加一行：上游版本范围、采纳的 commit、对应的本地 commit、跳过项及原因。
