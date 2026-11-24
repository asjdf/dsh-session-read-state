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
标签 `vX.Y.Z` 和 GitHub Release（启用 npm 发布后还包括 npm 版本）。

提交格式：

```text
feat: 支持在菜单里切换已读状态

在侧栏会话行上右键即可标为已读或未读，标为未读的会话在标题旁显示「新」。

Closes #12
```

破坏性变更：类型后面加 `!`，正文里再写 `BREAKING CHANGE:` 脚注。只加 `!` 而没有脚注
的提交不会触发主版本，两者要一起写：

```text
feat!: 标记改为写入 Host

已读标记改为持久化保存，不再依赖浏览器本地存储。

BREAKING CHANGE: 标记保存在 Host 上，浏览器里已有的标记不再读取。
```

`refactor:`、`fix:` 等没有版本语义的类型也可以触发主版本，只要同时带上 `!` 和
`BREAKING CHANGE:` 脚注。

## 发布前检查

1. 推送到 `main` 时，`Release` 工作流的 `checks` 作业会先跑：解析插件包与两份语言
   文件、对 `client.js` 和 `index.js` 做语法检查、用 `commitlint` 校验最新提交。任何
   一项失败，发布不会开始。
2. 想在本地确认这次推送会发布成什么版本、带哪些变更，可以在仓库里预览。预览需要能
   从仓库 URL 读取分支信息，因此在 CI 之外、`GITHUB_TOKEN` 未配置时不会自动进入
   预览模式：

   ```text
   CI=true GITHUB_TOKEN=<有 repo 读权限的令牌> npm run release:dry
   ```

   预览会打印下一个版本号和生成的发布说明，不会打标签、不会创建 Release。

## 每次发布

1. 在 `main` 上用 conventional 提交信息提交并推送。
2. `checks` 通过后，`semantic-release` 找到上一个标签、读取它之后的提交、提升
   `packages/dsh-session-read-state/package.json` 的版本号、写入 `CHANGELOG.md`、
   创建 `vX.Y.Z` 标签和 GitHub Release（发布说明由提交信息生成），并把版本与变更
   日志写回 `main`。
3. 安装结果：`dsh plugin add dsh-session-read-state@X.Y.Z`，或在 checkout 里切到该
   标签按路径安装。

## 当前范围：只发 GitHub

`.releaserc.js` 只挂 `commit-analyzer`、`release-notes-generator` 和
`@semantic-release/github`，所以每次发布只会：升插件包版本号、写 `CHANGELOG.md`、
打标签、创建 GitHub Release。需要时再按下面的步骤接上 npm 发布。

启用 npm 发布时：

1. 在 npm 为 `asjdf/dsh-session-read-state` 创建 granular access token，权限为
   *Read and write*。
2. 在仓库 Secrets 里保存为 `NPM_TOKEN`。
3. 在 `.releaserc.js` 的 `plugins` 里加 `'@semantic-release/npm'`（放在
   `release-notes-generator` 之后），并在 `.github/workflows/release.yaml` 的
   `Semantic Release` 步骤补上 `NPM_TOKEN: ${{ secrets.NPM_TOKEN }}`。

插件包已带 `publishConfig`（`access: public`、`provenance: true`、官方 registry），
接上 npm 后无需再改其他字段。

## 预发布

需要一边维护旧版本、一边预览新特性时，用 pre-release 分支：

1. 在 `.releaserc.js` 的 `branches` 里加入 `{ name: 'beta', prerelease: true }`。
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
