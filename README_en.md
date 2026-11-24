# dsh-session-read-state

[![release](https://github.com/asjdf/dsh-session-read-state/actions/workflows/release.yaml/badge.svg)](https://github.com/asjdf/dsh-session-read-state/actions/workflows/release.yaml)

A DeepSeek Harness plugin that adds a read/unread mark to sidebar sessions:
right-click a session to mark it read or unread, and an unread session keeps a
**New** pill beside its title.

中文：[README.md](README.md)。插件功能与限制见
[packages/dsh-session-read-state/README.md](packages/dsh-session-read-state/README.md)。

## Install

Every release attaches the packed plugin `dsh-session-read-state-X.Y.Z.tgz` to its
GitHub release; download it and install by path, without npm:

```text
dsh plugin add ./dsh-session-read-state-X.Y.Z.tgz
```

Or install the checkout directly: `dsh plugin add ./packages/dsh-session-read-state`.

## Releases

Versions come from commit messages, through
[semantic-release](https://semantic-release.gitbook.io/): `fix:` publishes a
patch, `feat:` a minor, a `!` plus a `BREAKING CHANGE:` footer a major, and
`docs:`, `chore:`, and `refactor:` publish nothing. Pushing to `main` runs the
`Release` workflow: manifest and entry checks, a commitlint check, then the
version bump, `CHANGELOG.md`, the `vX.Y.Z` tag, the GitHub release, and the
attached plugin tarball. Releases are entirely on GitHub; no npm account or
token is needed. See [docs/RELEASE.md](docs/RELEASE.md).
