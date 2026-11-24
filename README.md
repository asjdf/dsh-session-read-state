# dsh-session-read-state

[![release](https://github.com/asjdf/dsh-session-read-state/actions/workflows/release.yaml/badge.svg)](https://github.com/asjdf/dsh-session-read-state/actions/workflows/release.yaml)

DeepSeek Harness 插件：在侧栏的会话上右键，即可一键标为已读或未读，未读的会话在
标题旁显示「新」。

English: [README_en.md](README_en.md)

## 安装

```text
dsh plugin add dsh-session-read-state
```

也可以从本仓 checkout 按路径安装：`dsh plugin add ./packages/dsh-session-read-state`。

## 版本与发布

版本号由提交信息决定，不需要手改：

| 提交 | 发布 |
|---|---|
| `fix: …` | 补丁版本 |
| `feat: …` | 次版本 |
| `feat!: …` 加 `BREAKING CHANGE:` 脚注 | 主版本 |
| `docs:`、`chore:`、`refactor:` 等 | 不发布 |

推送到 `main` 后，`Release` 工作流先校验插件包清单、入口语法和提交信息，再由
`semantic-release` 升版本、写 [`CHANGELOG.md`](CHANGELOG.md)、打 `vX.Y.Z` 标签并
创建 GitHub Release。当前只在 GitHub 上发版；要同时发布到 npm，给
`@semantic-release/npm` 配上 `NPM_TOKEN` 即可。

完整的变更流程、预发布分支与失败回退见 [docs/RELEASE.md](docs/RELEASE.md)。

## 仓库结构

```text
packages/dsh-session-read-state/  插件包（发布与安装的对象）
.releaserc.js                     semantic-release 配置
commitlint.config.json            提交信息规范
CHANGELOG.md                      自动生成，记录每个版本
.github/workflows/                提交校验与发布
docs/RELEASE.md                   发布流程
```

插件的功能、限制、图标许可与目录说明见
[packages/dsh-session-read-state/README.md](packages/dsh-session-read-state/README.md)。
