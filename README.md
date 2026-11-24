# dsh-session-read-state

[![release](https://github.com/asjdf/dsh-session-read-state/actions/workflows/release.yaml/badge.svg)](https://github.com/asjdf/dsh-session-read-state/actions/workflows/release.yaml)

DeepSeek Harness 插件：在侧栏的会话上右键，即可一键标为已读或未读，未读的会话在
标题旁显示「新」。

English: [README_en.md](README_en.md)

## 安装

每次发版都会把插件包打成 `dsh-session-read-state-X.Y.Z.tgz`，放在 GitHub Release 的
附件里；从附件下载后按路径安装，完全不经过 npm：

```text
dsh plugin add ./dsh-session-read-state-X.Y.Z.tgz
```

也可以直接从本仓 checkout 安装：`dsh plugin add ./packages/dsh-session-read-state`。

## 版本与发布

版本号由提交信息决定，不需要手改：

| 提交 | 发布 |
|---|---|
| `fix: …` | 补丁版本 |
| `feat: …` | 次版本 |
| `feat!: …` 加 `BREAKING CHANGE:` 脚注 | 主版本 |
| `docs:`、`chore:`、`refactor:` 等 | 不发布 |

推送到 `main` 后，`Release` 工作流先校验插件包清单、入口语法和提交信息，再由
`semantic-release` 升版本、写 [`CHANGELOG.md`](CHANGELOG.md)、打 `vX.Y.Z` 标签、
创建 GitHub Release，并把插件包 tarball 作为附件上传。发布完全在 GitHub 上完成，
不需要 npm 账号或令牌。

完整的变更流程、预发布分支与失败回退见 [docs/RELEASE.md](docs/RELEASE.md)。

## 功能、限制与开发

插件做什么、标记怎么清、有哪些限制、图标许可，以及目录结构，见
[packages/dsh-session-read-state/README.md](packages/dsh-session-read-state/README.md)。

## 仓库结构

```text
packages/dsh-session-read-state/  插件包（打包与安装的对象）
scripts/pack-release.cjs          发版时打 tarball 并作为 Release 附件
.releaserc.cjs                    semantic-release 配置
commitlint.config.js              提交信息规范
CHANGELOG.md                      自动生成，记录每个版本
.github/workflows/                提交校验与发布
docs/RELEASE.md                   发布流程
```

插件的功能、限制、图标许可与目录说明见
[packages/dsh-session-read-state/README.md](packages/dsh-session-read-state/README.md)。
