# 序曲 · Overture 1.3.0

摄影、歌剧与时装的原生网页／品牌设计体系。46 种组件，Stage、Paper 与 Nocturne 三套主题，冷光与暖光两种光温，一个运动核心（光圈、显影、弹簧），胶卷暗盒，GPU 光圈舞台、局部显影、实时织物曲面、追光取景、红线照片墙，以及可导出 PNG / WebM 的品牌工坊。

**单文件演示**：[dist/overture-showcase.html](dist/overture-showcase.html)（6.6 MB）。样式、脚本、字体、照片、three.js 与 720p 宣传片都在这一个文件里，双击即可离线打开，GPU 依次尝试 WebGPU 与 WebGL2。

追光实验：第一面墙保持六张照片同时可见，每三格滚轮将光束切到下一张照片中心；第二面墙每两格滚轮切换一张。第二幕换片时，照片、相纸边框、题名、套准标记和胶片齿孔一起运动。

## 1.3.0 · 交互动态

- **运动核心 `Overture.motion`**：三个动作语法各有一个原语。开幕用 `iris()`（以触发点为圆心的光圈，另有快门、展开形状，退出约为进入的 0.6 倍并加速离场）；显影用 `develop()`、`flip()`、`count()`；共振用 `spring()`（阻尼谐振子解析解，改目标时保留位置和速度，`freeze()` 冻结位移和速度）。五种预设：snap 340 ms、settle 570 ms、stage 830 ms、resonance（周期 0.53 s）、swing（周期 1.05 s）。CSS 用同一组常数生成的 `--ov-spring`、`--ov-settle`（`linear()` 缓动）。
- **组件**：所有浮层（Dialog、Drawer、CommandPalette、Popover、Toast、灯箱）都有进入和退出，Esc、遮罩、按钮、保存一视同仁；照片墙运镜、光圈开幕、底片带、刻度针、取景框都走弹簧；丝绸松手后回荡，凝住停在回荡中途；胶片两端橡皮筋回弹，相纸落桌回弹；追光第三格光束移到下一张照片（途中收窄、到达张开，只停在六个固定灯位）；相纸被指针拂过会绕图钉摆动。减少动态时两面照片墙改为淡出淡入，不直接跳换；单文件演示页默认完整动态（Windows 关闭“显示动画”时浏览器会报告减少动态）。明细见 [MOTION-SPEC.md](MOTION-SPEC.md)。
- **声音 `Overture.sound`**：八种 Web Audio 合成声音（齿轮、快门、拨杆、相纸、落桌、丝绸、光圈、移光），默认关闭，`Overture.setSound(true)` 后只在有意义的动作上出现。
- **主题切换**：`Overture.setTheme(theme, root, {origin})` 或 `nextTheme(root, {origin})` 以光圈从按钮扩散（浏览器支持 View Transitions 时）。
- **修复**：DevelopImage 的 GPU 宿主是行内元素，画布只有约 2 × 2 像素、显示为黑色；已改为块级。

## 1.2.0 · 冷光、夜场与胶卷暗盒

- **冷光**：新增 `--ov-cold`、`--ov-indigo`，`--ov-focus` 改为冷光。悬停取景、输入聚焦、光束边缘、开关关闭窗和加载都用冷光表示；选中、动作和错误仍用朱红。
- **Nocturne · 夜场**：第三套主题，`data-theme="nocturne"` 或 `Overture.setTheme('nocturne')`；`Overture.nextTheme()` 按暗场 → 印纸 → 夜场依次切换。组件库和品牌工坊的主题按钮会按这个顺序循环。
- **FilmCanister · 胶卷暗盒**：`Overture.mount('FilmCanister', host, {pulled: 3})`。拉出胶片，把照片向下拖出成相纸，放到桌面上显影。展示页新增 INTERLUDE · NOCTURNE 一幕。
- **dist 自带全部内容**：运行时、样式、字体、照片、three.js、GPU 引擎、目录和 15 秒宣传片（`dist/assets/video/overture-promo-15s.mp4`）都在 `dist/` 里，可以单独拷走使用。

## 设计系统演示页

`dist/catalog/index.html`（服务地址 `/catalog/`）是完整的设计系统演示，仍由 ds-viewer 从 `project/` 生成：

- 封面：15 秒宣传片（配乐 A），静音循环。系统设置为减少动态时，停在照片墙一帧。
- Showcase：九段现场演示，依次为：带章节跳转的宣传片、三个动作语法、两种光温（记录每次交互属于冷光还是朱红）、三套主题并排、胶卷暗盒、暗房组合（真实导出 PNG）、动效时间、品牌工坊、接入方式与全部页面。
- 其后是七章规范、token（主题按钮会同时切换整页和所有预览）、46 张组件卡和资产。页面皮肤来自 `project/catalog.css`，使用本系统自己的令牌和字体。

源文件：`project/showcase/*.html`、`project/catalog.css`、`src/catalog-cover.html`。不要直接修改 `dist/catalog/`。

## 本机运行

双击 [START.cmd](START.cmd)，或在本目录运行：

```powershell
node tools/build.mjs
node tools/serve.mjs
```

打开 [单文件动态演示](http://127.0.0.1:4198/overture-showcase.html)、[三幕展示](http://127.0.0.1:4198/?motion=full)、[追光实验与暗房](http://127.0.0.1:4198/light-studies.html?motion=full)、[组件库](http://127.0.0.1:4198/components.html)、[品牌工坊](http://127.0.0.1:4198/studio.html)、[设计规范目录](http://127.0.0.1:4198/catalog/index.html)。需 Node.js 与现代浏览器；依赖、字体和图像已保存到本地，无需 npm install、在线 CDN 或账号。

本地文件入口：[单文件动态演示](dist/overture-showcase.html)（可直接双击） · [展示](dist/index.html) · [追光实验](dist/light-studies.html) · [组件](dist/components.html) · [工坊](dist/studio.html) · [ds-viewer 查看页](dist/catalog/index.html) · [最小接入](dist/starter.html)。GPU 模块与录制应通过上方 HTTP 服务使用。

## 结构

| 位置 | 内容 |
| --- | --- |
| project/tokens.json | 颜色、字体、间距、圆角、阴影、动效令牌 |
| src/core.js | 公开 API、状态模型、事件与资源清理 |
| src/dynamics.js / dynamics.css | 运动核心：光圈、显影、FLIP、翻片、弹簧；CSS 弹簧缓动与各组件的声明式动态 |
| src/sound.js | 可选交互声音（Web Audio 合成，默认关闭） |
| src/demo.* · src/embed/ | 单文件演示页的源码与内嵌素材（WebP 照片、720p 宣传片，由 tools/prepare-embed.py 生成） |
| tools/build-standalone.mjs | 把样式、脚本、字体、照片、three.js 与宣传片打包成 dist/overture-showcase.html |
| src/controls.js / overlays.js / media.js / contact.js / light.js / brand.js | 六个组件实现模块，共用原生 HTML 语义 |
| src/engine.mjs | three.js / TSL 图形核心 |
| src/components.css / motion.css | 组件与追光动效样式 |
| src/catalog-data.mjs | 46 个组件的登记、用法、状态与 API 说明 |
| src/film.js / film.css | 胶卷暗盒：拉片、拖出成相纸、桌面摆放 |
| src/cold.css | 冷光层：聚焦、悬停取景、光束边缘 |
| project/assets/video/ | 15 秒宣传片，构建时复制到 dist/assets/video |
| project/guidelines/ | 品牌、交互、接入、GPU 与结构规范 |
| project/components/ | 构建生成的 bundle 和逐组件卡片，供 ds-viewer 使用 |
| project/assets/ · project/fonts/ | 本地素材、参考图、品牌资源与字体 |
| dist/ | 可直接接入的运行时与本地站点，生成物 |

## 验证与边界

运行 `npm test`、`npm run verify`；本机图形与交互检查见 [VERIFICATION.md](VERIFICATION.md)。换了照片或宣传片后，先运行 `python tools/prepare-embed.py --ffmpeg <ffmpeg.exe>` 重新生成内嵌副本，否则单文件构建会报错。光圈舞台采用 GPU 处理的摄影底图；织物使用图像细节与 2.5D GPU 曲面变形，不是完整布料物理模拟。宣传录制为无声 WebM。

本次是独立体系，不依赖其他设计系统的内部实现。摄影示例由 AI 生成，不代表真实客户或个人履历。来源、固定版本、许可证和提示词见 [SOURCES.md](SOURCES.md)。设计与验收规格见 [DESIGN.md](DESIGN.md)。
