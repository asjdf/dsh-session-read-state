# dsh-session-read-state

给 DeepSeek Harness 的侧栏会话加一个「已读 / 未读」标记：在会话上右键即可一键
标为已读或未读，未读的会话在标题旁显示「新」。

## 功能

- **标为未读**：标题旁出现「新」标签，保留到你再次标为已读或打开该会话。
- **标为已读**：收起该会话「已完成」的提示（在别处跑完、你还没看过的那个圆点），
  直到你打开它一次；之后再跑完会重新算未读。正在等审批、等回答、或子任务还在跑的行
  保留它们自己的状态圆点。
- 每次标记都会弹出一条带「撤销」的提示。

## 使用

1. 在侧栏的会话上右键，或点该会话行末的「更多」按钮。
2. 菜单里多出一行「标为已读会话」或「标为未读会话」，位置在「分叉会话」与
   「复制 Session ID」之间；「归档会话」仍在菜单底部。
3. 这一行带着与「重命名」「归档」同一套图标：划掉的眼睛表示标为已读，普通眼睛表示
   标为未读。

## 安装

```text
dsh plugin add /path/to/dsh-session-read-state
```

也可以在 Plugins 页面添加本地目录。这个插件是 host 与前端的混合 bundle：

- 包内 `cordis.patch.yml` 同时写了 `insert` 行与同 id 行，合并后只有一条加载行，
  每次启动都会加载，不依赖插件管理器的「已启用」标记。
- 加载行下的 `config: {}` 让 Host 在激活时重新解析 `./client`，避免命中旧字节缓存。

**改完插件代码后需要重启一次 `dsh web`**：Host 用文件元数据（修改时间、创建时间、
大小）判断是否重读客户端包，只刷新浏览器不会换掉服务端已读进内存的那份字节。

## 限制

- 标记保存在当前浏览器的 `localStorage`，按会话 id 记录。不会同步到其他浏览器或
  机器，清除站点数据即清除。不写入会话记录，模型也看不到。
- 同一浏览器的其他标签页通过 `storage` 事件同步；无痕模式或禁用存储时，标记只在
  刷新前有效。
- 已读标记覆盖到该会话下一轮结束为止，长跑的后台会话在那一轮结束后会重新算未读。
- 行上的装饰直接画在页面上：被列表隐藏的会话（折叠分组、其他筛选）重新出现时才
  显示标记。

## 图标

插件图标取自 [Lucide](https://lucide.dev/icons/eye-off) 的 `eye-off`
（ISC License，© Lucide Icons and Contributors），颜色改为侧栏图标的板岩灰
`#5b6b7c`，按 24 单位网格等比放大到 36px 瓦片。它与菜单行「标为已读会话」使用的是
同一个划掉的眼睛，插件条目和菜单项读起来是同一个功能。SVG 只含几何图形，无脚本、
样式、文字或外部引用。

## 版本

`0.1.0`。插件页显示的版本号来自本包 `package.json` 的 `version`；本地 link 安装的
插件不走 registry，不会自动递增。未发布期间保持 `0.1.0`，首次发布或交付给别人时再
升号。

## 开发

- `client.js` 是全部行为：会话行上的右键入口、菜单行、行上的「新」标签，以及把
  「已完成」圆点收起。`index.js` 是空的 Host 端。
- 只依赖 DSH 客户端提供的服务：必须的是 `sessions`、`locale`、`contextMenus`；
  可选的是 `uiSession`（「已完成」判据）与 `slots`（菜单图标），两者都经
  `ctx.get(...)` 读取并判空。Cordis 对未在 `inject` 声明的属性读取会直接抛错。
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
