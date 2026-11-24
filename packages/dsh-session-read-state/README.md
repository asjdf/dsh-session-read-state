# dsh-session-read-state

给 DeepSeek Harness 的侧栏会话加一个「已读 / 未读」标记：在会话上右键即可一键标为
已读或未读，未读的会话在标题旁显示「新」。

## 在哪里找

在侧栏的会话上右键，或点该会话行末的「…」按钮。Session 菜单里会多出一行
**标为已读会话** 或 **标为未读会话**（随该会话当前状态切换），位置在「分叉会话」与
「复制 Session ID」之间；「归档会话」仍在菜单底部。每次标记都会弹出一条带「撤销」的
提示。

行末的「…」按钮打开的是同一个菜单，所以触屏上也能用到这个操作。

菜单行使用与「重命名」「置顶」「归档」「分叉」「复制」同一套图标：划掉的眼睛表示
标为已读，普通眼睛表示标为未读。

## 标记的含义

| 标记 | 什么时候产生 | 什么时候清除 |
|---|---|---|
| 未读 | 点「标为未读会话」，无论该会话这一轮是否已结束 | 点「标为已读会话」，或打开该会话 |
| 已读 | 点「标为已读会话」，也包括对「已完成但未查看」的会话 | 打开该会话，或该会话之后又结束了一轮 |

**已读**会收起该行「已完成但未查看」的提示——DeepSeek Harness 会给在别处结束、你还没
看过的会话显示一个「已完成」圆点——直到你打开这个会话一次。之后标记自动消失，再结束一轮
会重新显示为未读。正在等待审批或回答、或还有子智能体在运行的会话，无论标记如何都保留它
们的实时圆点。**未读**则在没有任何一轮结束时也会显示「新」标签。

打开会话永远是最高优先级的动作，这也是 Harness 本来就用来确认「已完成但未查看」的手势。

## 限制

- 标记保存在当前浏览器的 `localStorage`，按会话 id 记录。不会同步到其他浏览器或机器，
  清除站点数据即清除。不写入会话记录，模型看不到。
- 同一浏览器的其他标签页通过 `storage` 事件同步；无痕模式或禁用存储时，标记只在刷新前
  有效。
- 已读标记覆盖到该会话下一轮结束为止，长跑的后台会话在那一轮结束后会重新算未读。
- 行上的装饰直接画在页面上。被列表隐藏的会话（折叠分组、其他筛选）重新出现时才显示
  标记。
- 禁用该 bundle 会移除菜单行、提示和所有装饰；已存的标记保留在浏览器里，直到其状态
  清除或重新启用。

## 图标

插件图标取自 [Lucide](https://lucide.dev/icons/eye-off) 的 `eye-off`（划掉的眼睛），
颜色改为侧栏图标的板岩灰 `#5b6b7c`，并按 Lucide 的 24 单位网格等比放大到 36px 瓦片。
它与菜单行「标为已读会话」使用的是同一个划掉的眼睛，插件条目和菜单项读起来是同一个
功能。SVG 只含几何图形，无脚本、样式、文字或外部引用。

Lucide 采用 ISC 许可证：

```text
ISC License

Copyright (c) Lucide Icons and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
```

其中的 `eye-off` 图形未使用 Feather 项目的衍生部分，因此只需保留上面这段 ISC 声明。

## 版本

`0.1.0`。插件页显示的版本号来自本包 `package.json` 的 `version`；作为 bundle 安装时，
Profile 不会到 registry 查询它，也不会和已发布版本比较。在首次发布之前保持 `0.1.0`，
发布或交给别人时再升号。插件页可能仍显示上次读取到的快照版本，刷新后才是最新值。

## 开发

- `client.js` 是全部行为：会话行上的右键入口、菜单行、行上的「新」标签，以及把
  「已完成」圆点收起。`index.js` 是空的 Host 端。
- 只依赖 DSH 客户端提供的服务：必须的是 `sessions`、`locale`、`contextMenus`；
  可选的是 `uiSession`（「已完成」判据）与 `slots`（菜单图标），两者都经
  `ctx.get(...)` 读取并判空。Cordis 对未在 `inject` 里声明的属性读取会直接抛错。
- 目录结构：

  ```text
  client.js            前端插件（模块工厂 + apply）
  index.js             Host 端（空）
  cordis.patch.yml     加载行
  package.json         清单：dsh.bundle / dsh.client / exports
  locale/zh.json       中文标题、描述与详情页指向
  locale/en.json       英文标题、描述与详情页指向
  docs/DETAIL.zh.md    中文详情页（单张预览图）
  docs/preview.zh.svg  中文预览图
  docs/DETAIL.md       英文详情页
  docs/preview.svg     英文预览图
  icon.svg             插件图标
  ```
