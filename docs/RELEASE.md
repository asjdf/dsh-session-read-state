# 发布流程

`semantic-release` 根据提交信息决定下一个版本号并自动发布；没有人手改版本号，也不打
手工标签。本文件是这个流程的运行手册。

## 版本规则

| 提交信息 | 发布结果 |
|---|---|
| `fix: …` | 补丁版本（`0.1.0` → `0.1.1`） |
| `feat: …` | 次版本（`0.1.0` → `0.2.0`） |
| 任意类型加 `!`，并在正文写 `BREAKING CHANGE:` 脚注（如 `feat!:` 加脚注） | 主版本（`0.1.0` → `1.0.0`） |
| `docs:`、`chore:`、`style:`、`refactor:`、`test:`、`ci:`、`build:`、`perf:`、`revert:` | 不发布 |
| 没有 conventional 前缀 | 不发布，`commitlint` 直接拒绝 |

同一个版本号会同时出现在：插件包 `packages/dsh-session-read-state/package.json`、Git
标签 `vX.Y.Z`、GitHub Release，以及 Release 附件里的 `dsh-session-read-state-X.Y.Z.tgz`。

提交格式：

```text
fix: 修正图标颜色

菜单里的眼睛图标改为与侧栏图标同一套描边。
```

破坏性变更：类型后面加 `!`，正文里再写 `BREAKING CHANGE:` 脚注。只加 `!` 而没有脚注
的提交不会触发主版本，两者要一起写：

```text
feat!: 标记改为写入 Host

已读标记改为持久化保存，不再依赖浏览器本地存储。

BREAKING CHANGE: 标记保存在 Host 上，浏览器里已有的标记不再读取。
```

## 发布产出的三件东西

| 产出 | 在哪里 | 用途 |
|---|---|---|
| 标签 `vX.Y.Z` | 仓库 Tags | 版本定位，可检出该版本源码 |
| GitHub Release | Releases 页 | 发布说明（由提交信息生成）+ 附件 |
| 插件包 tarball | Release 的附件 | 直接安装，不需要 npm |

## 安装方式（都不经过 npm）

```text
# 1. 从 Release 附件安装（推荐）
dsh plugin add ./dsh-session-read-state-X.Y.Z.tgz

# 2. 直接从 GitHub 源码安装，版本固定在标签上
dsh plugin add github:asjdf/dsh-session-read-state#vX.Y.Z

# 3. 从 checkout 按路径安装
dsh plugin add ./packages/dsh-session-read-state
```

方式 1 安装的是打包产物，不需要任何构建授权，也不需要 npm；方式 2 需要 pnpm 从 GitHub
拉源码，第一次会要求你在 profile 的 `pnpm-workspace.yaml` 里为该包授权 `allowBuilds`；
方式 3 只适合本机开发。日常安装优先用方式 1。

## 本地打包

不经过 CI 也能生成同一个 tarball：

```text
cd packages/dsh-session-read-state
npm pack
```

发版时 tarball 由 `scripts/pack-release` 生成：它临时把包内版本号对齐到即将发布的版本
（这样文件名、包内 `version` 与标签 `vX.Y.Z` 一致），打包完成后立即还原文件，因此仓库
里 `package.json` 的版本仍由回写流程维护。

产物是 `dsh-session-read-state-X.Y.Z.tgz`，内容与 `package.json` 的 `files` 一致：
`client.js`、`index.js`、`cordis.patch.yml`、`locale/*.json`、`docs/*`、`icon.svg`、
`README.md`。`node_modules` 与测试文件不会被打进去。

## CI 做什么

`Release` 工作流（`.github/workflows/release.yaml`）在推送到 `main` 时运行：

1. `checks`：解析插件包清单与两份语言文件、对 `client.js` 和 `index.js` 做语法检查、
   用 `commitlint` 校验最新提交。任何一项失败，发布不会开始。
2. `release`：找不到上一个标签就从头读取提交，找到后则只读取标签之后的提交；没有
   `fix:`/`feat:`/破坏性变更时直接结束，有则升版本、写 `CHANGELOG.md`、打标签、
   创建 Release，并把版本与变更日志写回 `main`。

## 要不要发布到 npm

不需要。tarball 与 GitHub 源码已经足够安装。只有下面两种情况值得接上 npm：

- `dsh plugin add dsh-session-read-state`（不带路径和 tag）要按包名解析版本；
- 希望别的机器、别的人用 `dsh plugin add dsh-session-read-state@X.Y.Z` 按版本号安装。

接上 npm 的步骤：

1. 在 npm 为 `asjdf/dsh-session-read-state` 创建 granular access token，权限为
   *Read and write*。
2. 在仓库 Secrets 里保存为 `NPM_TOKEN`。
3. 在 `.releaserc.cjs` 的 `plugins` 里加 `'@semantic-release/npm'`（放在
   `release-notes-generator` 之后，它会自动把当前版本打进 tarball 并上传），并在
   `.github/workflows/release.yaml` 的 `Semantic Release` 步骤补上
   `NPM_TOKEN: ${{ secrets.NPM_TOKEN }}`。

插件包已带 `publishConfig`（`access: public`、`provenance: true`、官方 registry），
接上 npm 后无需再改其他字段。

## 预发布

需要一边维护旧版本、一边预览新特性时，用 pre-release 分支：

1. 在 `.releaserc.cjs` 的 `branches` 里加入 `{ name: 'beta', prerelease: true }`。
2. 从 `main` 切出 `beta` 分支，提交 `feat:`，推送后得到 `vX.Y.Z-beta.N` 预发布版本，
   GitHub 上标记为 Pre-release。
3. `beta` 合回 `main` 后，`main` 上会正常发一个正式版本。

修复旧版本时，从对应标签切出 `X.Y.x` 维护分支，提交 `fix:` 后发布该线的补丁版本；
分支规则同样写在 `branches` 里。

## 失败与回退

- 工作流失败时不会留下半成品：版本提升、`CHANGELOG.md`、标签和 Release 在同一个发布
  步骤里完成，任一步失败都不会创建标签。
- 需要重跑时，在 GitHub Actions 里重新运行工作流。
- 已经发出去的版本不要改标签：发一个 `fix:` 版本修正，语义化版本才能成立。
