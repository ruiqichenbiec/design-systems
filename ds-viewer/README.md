# DS Viewer · 本地设计系统查看页

工作区工具：把按 Claude Design System 文件布局存放的设计系统生成一个本地可浏览页面，功能对应 claude.ai 上的 Design System 页面，包括概览与封面、规范章节、颜色、字体、间距、圆角、阴影等 token、可运行的组件卡，以及资产。零依赖，只需 Node.js；生成后可直接双击打开，也可通过项目自己的静态服务打开。

## 用法

```powershell
node ds-viewer/build.mjs <system>
# 输出：<system>/dist/catalog/index.html
# 可选：--out <目录>
```

## 输入格式

在 `<slug>/project/` 下查找（没有 `project/` 时用 `<slug>/` 本身）：

| 文件 | 用途 |
| --- | --- |
| `README.md` | 概览正文；第一段作为简介 |
| 其他 `*.md`（`components/`、`assets/` 之外） | 规范章节，标题取第一个 `#` |
| `tokens.json` | Design System token 格式（每个 family 为 `{"tokens":[{name,value,usage}]}`，`color.themes` 为主题，`type.families` / `type.groups`）；自动生成 `tokens.css` |
| `design-system.json` | 可选：`title`、`namespace`、`libraries`、`assetGroups`、`lastChange` |
| `components/bundle.js` / `bundle.css` / `lib/*.js` | 预览运行时（经典脚本） |
| `components/<Comp>/preview.html` | 第一行 `<!-- @dsCard group="…" height=N subtitle="…" -->`，其余为预览内容 |
| `components/<Comp>/README.md` | 组件说明：首段显示在卡片上，其余放进 Guidelines 折叠区 |
| `components/Cover/preview.html` | 封面（不带 README），按 960px 宽度布局后缩放 |
| `assets/<Group>/…` | 本地资产文件；`design-system.json` 中登记、但本地没有文件的，显示为 “Stored online only” |
| `fonts/*` | 由 `tokens.json` 的 `type.fonts[].file` 引用 |
| `showcase/*.html` | 可选：整宽的现场演示段落，放在概览之后，按文件名排序。第一行 `<!-- @dsShowcase title="…" eyebrow="…" lede="…" height=N gl -->`，和组件预览一样在独立 iframe 中运行，共用 bundle、token 与主题切换 |
| `catalog.css` | 可选：系统自己的页面皮肤，追加在查看页自带样式之后，可用系统 token 与字体重设侧栏、标题与卡片 |

每个组件预览在独立的 iframe 中运行，因此同一页面可以并排展示不同变体。页面打开后所有预览依次加载（首屏优先），滚动时不会卸载或重启，状态保留。唯一例外：使用 WebGL 的预览（加载 three.js 或创建 WebGL 上下文，含 bundle 本身使用 WebGL 的情况）超过 12 个时，只有这些预览按视口窗口加载，以免超出浏览器约 16 个 WebGL 上下文的上限。预览会自动上报高度；多主题系统在侧栏切换主题时，所有预览同步切换。

标记补充：`@dsCard` / `@dsShowcase` 可写 `gl`，声明预览使用 WebGL/WebGPU（例如运行时动态加载引擎、正则看不出来的情况），以纳入 WebGL 上下文窗口管理；封面可写 `fluid`，按页面宽度排版而不是缩放 960px 画布。`assets/` 中的 mp4 / webm 以可播放视频显示。

## 约定

- 新增或更新本地设计系统时，都用本工具生成查看页；有构建脚本的系统，应在构建末尾调用它。
- 查看页属于生成物，不要手改；需要调整时改源文件或本工具。
- 预览依赖的库优先放在 `components/lib/`；React 18 找不到本地文件时回退到 jsDelivr CDN（需联网）。
