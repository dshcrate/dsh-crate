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

`npm test` 会跑 `tests/brand-guard.spec.ts`，品牌、数据源、三语文案、视觉几何、赞助商开关共 31 项断言，任何一项红都说明同步把本地定制覆盖了。

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
| `src/crate-catalog.ts` | 本仓专属目录适配层，上游没有；禁止删除或替换 |
| `tests/crate-catalog.spec.ts` | 本仓专属适配层测试，上游没有；禁止删除或替换 |

## 本仓专属文件与目录契约

上游没有下面这些文件，同步时不得删除或替换：

| 路径 | 作用 |
|---|---|
| `src/crate-catalog.ts` | crate 紧凑目录（`entries` + `i/n/d/s/...`）→ 内部 `Registry` 的唯一桥接层 |
| `tests/crate-catalog.spec.ts` | 桥接层测试，覆盖字段映射与脏输入回退 |

目录条目契约：`dsh-crate.json` 每条带 `a`（我方首次收录时间，ISO），由网页端 `dshcrate-web` 的 `MarketEntry.a` 生成；`asCratePlugin` 必须把 `row.a` 映射到 `added`，缺失、空串、非法日期或非字符串一律退回 `''`。

客户端依赖这个字段：

- 「最近收录」按 `added` 最近 7 天过滤，空值会被跳过
- 「收录时间」排序用 `added-desc` / `added-asc`，空值排在后面

同步后若这两处同时失效，先查 `a → added` 映射，不要先怀疑客户端。网页端改了字段名，插件端必须同步跟进。

## 保护机制

目的：上游同步时，凡本地定制一律不自动覆盖；被覆盖时测试立即变红，不靠肉眼检查。

### 保护清单 `sync/protected.json`

列出禁止整文件覆盖的路径，字段为 `path` / `why` / `merge`。同步脚本读取该文件；命中的文件只输出 diff，不写盘，由人工逐块合并。

覆盖范围：数据源地址、插件身份与自识别集合、三语文案、插件端界面、滚动与吸顶样式、导航图标、构建产物、插件元信息、包身份、logo、目录适配层与最近收录契约。

### 防护断言

`tests/brand-guard.spec.ts` 共 31 项，随 `npm test` 运行：

| 组 | 覆盖内容 | 数量 |
|---|---|---|
| A | 身份与升级 | 9 |
| B | 数据源 | 1 |
| C | 品牌文案 | 10 |
| D | 视觉与几何 | 4 |
| E | 设置页布局与滚动（吸顶与背景色、无内层滚动、吸顶变量） | 3 |
| F | 导航图标（行选择器、尺寸与掩膜、标记与清除） | 3 |
| G | 赞助商开关（`withSponsoredFirst` 必须随 `SHOW_SPONSORS` 关闭） | 1 |

上游同步后若 E/F/G 变红，说明设置页吸顶、导航背景色或图标定制、赞助商置顶开关被覆盖，按清单恢复后再提交。

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
- v1.77 起 AI 功能依赖宿主 `llm` / `commands` 服务：`src/index.ts` 的 `setModelAccess` 与 `ctx.inject(['commands'])` 不能丢；旧宿主会自动降级为“没有模型”，不要删降级分支
- `search-synonyms.ts` 已从 `src/client/` 移到 `src/`，同步时删除旧文件并更新两处 import，避免重复模块
- 构建产物也要查：`client/client.js` 中上游品牌必须为 0，`lib/registry.js` 必须含 `parseCatalog`；再用 `lib/registry.js` 的 `loadRegistry()` 真实加载一次线上目录，确认 `entries` 桥接可用
- 非保护文件按文件清单 checkout，不要 `git checkout <tag> -- tests` 整目录覆盖，否则会冲掉本地定制测试（品牌防护、滚动、图标、拓扑适配）
- `src/client/MarketHead.tsx` 顶部 logo 固定 `size={15}` + `translateX(2px)`；上游 v1.73.24 起是 18px 且无位移，cherry-pick 后会覆盖，必须回贴（brand-guard 17b 会拦）。投稿链接固定 `https://dshcrate.com/submit`，不要退回首页
- v1.78 起新增企业策略/目录/离线导入：`src/policy.ts`、`src/catalogs.ts`、`src/npmrc.ts`、`src/offline.ts`、`src/client/CatalogsPanel.tsx`、`SourceParts.tsx`、`source-status.ts`、`org-policy.ts`。新路由 `/dsh-crate/catalogs`、`/dsh-crate/catalogs/add`、`/dsh-crate/catalogs/remove`、`/dsh-crate/offline/import` 要按本地品牌回写
- `src/telemetry.ts` 的组织策略检查必须排在本地开关之前，但本地默认仍是开启；环境变量保留 `DSH_CRATE_TELEMETRY` / `DSH_CRATE_TELEMETRY_URL`，不要退回 `DSH_MARKET_*`
- `src/regions.ts` 的策略 mirrors 可以覆盖区域与环境，但本地目录仍只有一份 `https://dshcrate.com/data/dsh-crate.json`；不要把上游的 npm 目录包重新带回来
- `src/registry.ts` 的 `parseCatalog` 分派（crate 的 `entries` 与上游的 `plugins`）不能丢；`src/routes.ts` 继续用 `statePath`，不要退回 `.dsh-crate` 拼接
- `src/client/comments.ts` 的 giscus 配置是本地值：`dshcrate/dsh-crate`、`R_kgDOVeu1VA`、`Announcements`、`DIC_kwDOVeu1VM4DLuXo`；上游同步后要回贴。仓库 Discussions 已开启，giscus 只装在 `dsh-crate` 仓库
- `tsdown.config.ts` 的 `const id` 必须是 `dsh-crate`；上游 v1.80 是 `dshmarket`，构建后 `client/client.js` 头必须是 `window.__ModuleLoader__.load({ id: "dsh-crate"`，否则 normalize 会直接报错
- v1.79 起入口默认值改为：设置页入口默认关闭，Plugins 页签与侧栏默认开启；这是上游产品决定，不要无理由改回
- v1.80 的 self-reload 路由是 `/dsh-crate/reload-self`，安装包回退名是 `dsh-crate`；`src/self-reload.ts`、`src/client/client-version.ts`、`AddMenuMarketItem.tsx` 同步后要按本地品牌检查
- v1.80.1 起 e2e 不再假设设置页入口始终可见：`tests/web/scaffold.ts` 先走侧栏/Plugins 页签，只有确实需要设置页时才调用 `enableMarketSettings()`；`tests/catalogs.spec.ts` 用原生路径 + `pathToFileURL`，Windows 不再依赖 POSIX 字面量
- v1.80.3 起宿主请求网关优先用 `connection.admit`（`src/index.ts` 的 `gateScope` + `src/http.ts` 的 `admissionFacts`）；这段必须逐块合并，丢掉会让 0.2.3 宿主所有市场路由 403
- v1.80.3 新增 `tests/setup/jsdom-storage.ts`（Node 26 `localStorage` 遮蔽修复）；本仓原有的 `tests/setup/storage-globals.ts` 仍保留，`vitest.config.ts` 两者都挂，`jsdom-storage` 在前
- v1.80.2/3 的赞助商数据取上游 `sponsors.json` 与 `assets/partners/modelgo-*.svg`，但 `src/client/sponsors.generated.ts` 必须保留 `SHOW_SPONSORS = false`；`tests/web/sponsor-sidebar.e2e.ts` 在本地按 `SHOW_SPONSORS` 跳过，否则必红
- 外部赞助商 URL（如 `https://dsh-market.hualong-ai.com/`、`utm_source=dsh-market`）不做品牌回写；只回写代码标识、路由与产品名
- `src/crate-catalog.ts` 的 `a → added` 映射是「最近收录」和「收录时间」排序的唯一数据来源；上游没有这个文件，`a` 字段由网页端 `MarketEntry.a` 生成。同步时不要删除本仓专属文件，也不要把 `added` 改回空串（2026-11-25 加）
- v1.81.0/1 的 `sponsored-plugins` 置顶必须在 `market-install.ts` 调用处按 `SHOW_SPONSORS` 关闭；只关 logo 会继续把赞助商插件放到「最近收录」最前面

## 同步后品牌自检（每次必跑）

2026-11-24 同步 v1.80.3 时漏掉过下面几处，均已补回；下次同步按这张表逐项过：

- [ ] `grep -rn "plugin market" src/find-plugin.ts src/client tests/web --include='*.ts' --include='*.tsx'`：只允许 `tests/web/desktop-settings.e2e.ts` 的历史兼容正则；`src/find-plugin.ts` 的系统提示词、e2e describe 标题不能留小写上游品牌。
- [ ] `grep -rn "name !== 'dsh-crate' && name !== 'dsh-crate'" src tests`：上游两个别名（`dsh-market` / `dshmarket`）回写成同一个后，同一表达式里会出现恒假或重复条件；合并后改成单个判断。不同字段（如 `plugin.npm` 与 `plugin.name`）各判一次是正常的，不算重复。
- [ ] `grep -rn "awesome-dsh-plugin" src tests --include='*.ts' --include='*.tsx'`：整文件取上游会把本地注释退回上游目录名；恢复 `dshcrate` 说明后重建 `client.js`，产物里不能再出现。
- [ ] 新增文案/提示词逐个看品牌词：`Plugin market`、单独的 `market`、`插件市场` 要改成 `Plugin Crate`、`插件箱子`；brand-guard 18 只拦大写 `Plugin Market`/`插件市场`，拦不住小写和单个 `market`。
- [ ] `src/client/sponsors.generated.ts` 头注不能照抄上游 `scripts/sponsors.mjs`（本仓没有该脚本）；写明从上游同步、手工维护、开关位置。
- [ ] `src/client/market-install.ts` 的 `withSponsoredFirst` 必须包在 `SHOW_SPONSORS ? ... : recent` 里；只关 header logo 不等于关赞助商置顶，`tests/brand-guard.spec.ts` 第 33 项会拦。
- [ ] 批量回写品牌后，`dsh-crate` 作为对象键必须加引号（`'dsh-crate':`），属性访问必须用方括号（`obj['dsh-crate']`）；直接写 `dsh-crate:` / `.dsh-crate` 会让测试在 Vite 转换阶段直接 PARSE_ERROR。
- [ ] `DSH_CRATE_POLICY`、`DSH_CRATE_INSTALL_TIMEOUT_MS` 等环境变量名要和 `src/policy.ts` / `src/dsh-cli.ts` 一致；上游的 `DSH_MARKET_*` 不能留，测试里的旧名也要一起改。
- [ ] 最后 `grep -c "dshmarket\|dsh-market\|Plugin Market\|插件市场\|awesome-dsh-plugin" client/client.js`，期望 0；外部赞助商 URL（`dsh-market.hualong-ai.com`、`utm_source=dsh-market` 等）允许留在数据里，不计入代码品牌命中。

## 同步后测试自检

- [ ] `src/client/MarketLayout.tsx` 的 `Masonry` 在测量高度全为 0（jsdom、无布局引擎）时必须退回交替分列；否则 `market-section.client.spec.tsx` 的 masonry、Installed 排序、行菜单与冲突决策会连锁失败（2026-11-25 实际踩到 16 条）。
- [ ] `tests/web/desktop-update.e2e.ts` 的官方桌面分支只在 dsh 0.2.1+ 运行；`updateBundle` 原地更新只在 0.2.2+ 断言。低于 0.2.1 的宿主必须在 `describe.skipIf` 跳过，否则 0.1.x / 0.2.0 的 e2e 会红。
- [ ] `tests/client/market-section.client.spec.tsx` 里“市场自身不出现在 Installed”的断言用 `queryByTitle('dsh-crate')`，不能用 `queryByText`；头部仓库链接文字也是 `dsh-crate`，整屏文本查询会误命中。
- [ ] `npx vitest run tests/crate-catalog.spec.ts`：目录条目的 `a` 必须映射到 `added`，缺失/非法日期退回空串。这两处失效时「最近收录」会整块消失、「收录时间」排序变成无效排序，而且不会报错。

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
| 2026-11-21 | v1.74.0 → v1.75.0（`upstream/main` `f763bf6`） | `54de7b2`（Installed 页显示市场自身新版本提示：版本号、重启生效说明、更新按钮、按版本关闭、页签圆点） | 本次提交 | `4f449ec` 私有遥测看板与 `f763bf6` 删除看板净变化为 0、`6fd478f` 版本号、`SECURITY.md` 看板保留说明；保护文件逐块合并，保留 `SHOW_SPONSORS=false`、投稿链接与仓库链接修正，`locales.ts` 补三语 `marketOfferBanner`/`marketOfferHint`，`client.js` 本地重建 |
| 2026-11-23 | v1.78.0 → v1.80.0（`upstream/main` `8747e07`） | `c196186`（入口默认值、Plugins 页 logo 标题、Add plugin 菜单）、`36bf883`（自身更新后旧服务端提示）、`f105db3`（reload-self 热替换服务端）、`9673b89`（reload-self 返回 `{outcome,error}` 并保持版本真实）、`0f7bf14`（旧服务端横幅等待 /status、错误文案、Apply now）、`d610293`（e2e 公共构建 helper 与横幅截图） | 本次提交 | `db03a60`/`8747e07` 仅版本号；8 个保护文件三方合并，保留 `dsh-crate` 身份、设置页吸顶、顶部 logo 15px+右移 2px、投稿 `/submit`、`SHOW_SPONSORS=false`、giscus 配置；`tsdown` loader id 回写 `dsh-crate`，reload 路由 `/dsh-crate/reload-self`，包回退名 `dsh-crate`；`client.js` 与 `lib/` 本地重建；测试基线 4,386 通过 / 3 跳过 |
| 2026-11-24 | v1.80.0 → v1.80.3（`upstream/main` `6ef6055`） | `ae3402a`（Windows 原生目录路径、e2e 可见入口）、`5dd2017`（self-reload e2e 不阻塞 fixture）、`8f00457`（恢复安装任务等待）、`1952232`（AI 结果保留精确来源）、`cac579b`（AI 用 DSH 模型默认值）、`fa51888`（`engines.dsh` 覆盖宿主 peer）、`f4b70a8`（Installed 行不再误报 on）、`b3689dd`（THEMING.md）、`29dc1ee` + `e576c13`（`connection.admit` 网关与登录注册表）、`48c3e6d`（monorepo 子包 commit）、`cab3bd8`（离线包新导入替换旧包）、`bbe4713`（jsdom localStorage 修复）、`62940e4`/`6ef6055`（ModelGo 与侧栏赞助位） | 本次提交 | 上游站点/`scripts/sponsors.mjs`/`ENTERPRISE*`（本仓无站点链路）；版本号取本地 `0.6.3`；保护文件逐块合并，保留 `dsh-crate` 身份、logo 15px+右移 2px、投稿 `/submit`、`SHOW_SPONSORS=false`、giscus、设置页吸顶；赞助商数据取上游但渲染开关保持关闭，`sponsor-sidebar.e2e.ts` 本地跳过；`client.js` 与 `lib/` 本地重建 |
| 2026-11-24 | v1.80.3 → v1.81.1（`upstream/main` `ddf2424`） | `53b8d2a`（赞助商插件置顶、最近收录卡片变高）、`fdab350`（README 安装说明）、`ddf2424`（头部与 logo 对齐、AI 提示移到搜索框下、最近收录名称/描述打开详情弹窗、新版标签显示可更新时间） | 本次提交（0.6.4） | README/`scripts/sponsors.mjs` 跳过；保护文件逐块合并；`sponsored-plugins` 置顶按 `SHOW_SPONSORS` 关闭；`locales.ts` 新增两键并保留本地品牌；`client.js` 本地重建 |
| 2026-11-25 | v1.81.1 → v1.84.1（`nightly1014` `b8147f2`） | `04a98ff`（官方桌面走宿主 `updateBundle`，市场自身也走宿主）、`7f370dd`（宿主原地替换后报告 live）、`7249559`/`7f370dd`（0.2.1 保留 remove+install）、`0bb6f28`（registry 无 bundle 回退、下载缺失提示）、`37fcc52`（赞助商行悬停大卡片）、`056229e`（按实测高度平衡瀑布流）、`8a68ceb`（Tasks 按钮显示 Uninstalling/Updating）、`188c1fc`（记住每页条数、表达式门控可重新开启）、`235f488`（目录分页下发）、`ac39cdb`（Installed 页显示被关闭但可更新的数量） | 本次提交（0.6.5） | README/站点/`scripts/sponsors.mjs`/版本号 `1.84.1` 跳过；保护文件三方合并，保留 `dsh-crate` 身份、logo 15px+右移 2px、投稿 `/submit`、`SHOW_SPONSORS=false`、giscus、设置页吸顶；`sponsored-plugins` 置顶继续按开关关闭；新增 `desktop-update.e2e.ts` 按宿主版本跳过 0.2.1 以下；`Masonry` 零高度时保持交替分列；`client.js` 与 `lib/` 本地重建；测试基线 4,465 通过 / 3 跳过 |

新的同步完成后，在表里追加一行：上游版本范围、采纳的 commit、对应的本地 commit、跳过项及原因。
