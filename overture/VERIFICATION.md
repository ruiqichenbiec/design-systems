# 1.3.0 追加 · 追光两面墙的切换动画 · 2026-09-30

> 开源说明：这是开发过程中的验证日志。文中引用的截图、JSON 证据和导出视频没有随仓库发布。

用户反馈：“V 那部分的两个每次滚动生效的时候加一点动画，不要直接换”。

- 原因：本机 Windows 关闭了“显示动画”（SPI_GETCLIENTAREAANIMATION = false），浏览器报告 `prefers-reduced-motion: reduce`，演示页跟随系统进入减少动态，两面墙的切换因此直接跳换，全页其他动效也被关掉。
- 修改：演示页默认完整动态（页头可切到“减少”，也可用 `?motion=`）；FlashlightFocus 第三格光束沿 settle 弹簧移到下一张照片中心，途中收窄到 70 %、到达后张开，只停在六个中心；减少动态时两面墙改为 420 ms 淡出淡入 `Overture.motion.dissolve()`，不做位移；引擎新增 `setBeam()`，光束移动时每帧只更新并绘制一次。
- `npm test` 39/39（新增 dissolve 无舞台时仍执行一次切换），`npm run verify` 119/119。
- [Act V 检查](verification/v1.3.0/v-results.json) 8/8，在无头 Chrome 中模拟本机的减少动态设置：页面以完整动态打开；光束移动途中出现 19–21 个中间位置、最小收窄 0.70、最终停在下一张照片中心（误差 < 0.002）；照片墙运镜途中有中间位置、最终落在下一张；切到减少动态后，两面墙的遮罩升到不透明、光束只出现新旧两个位置、照片墙没有中间位置；0 条控制台消息。完整交互套件（更新了追光一项）仍为 25/25。
- 画面：[光束移动](verification/v1.3.0/v-light-travel-strip.jpg) · [照片墙运镜](verification/v1.3.0/v-wall-camera-strip.jpg) · [减少动态淡出淡入](verification/v1.3.0/v-light-dissolve-strip.jpg)。
- 未覆盖：真实鼠标滚轮在不同硬件上的节奏；观感由用户验收。

---

# 1.3.0 · 交互动态与单文件演示 · 2026-09-30

运动核心 `Overture.motion`、可选声音 `Overture.sound`、46 个组件的动态更新，以及单文件演示 `dist/overture-showcase.html`。

- `node tools/build.mjs`：46 个组件、7 章规范、9 段 Showcase；单文件 6.63 MB，内嵌 12 个素材（11 张 WebP、720p 宣传片）与 gzip 后的 three.js、引擎。
- `npm test` 38/38（新增 11 项：弹簧解析解三种阻尼、预设特性、改目标时位置与速度连续、冻结与解冻、减少动态直接落位、弹簧令牌与 `linear()` 缓动和运行时一致、橡皮筋及其逆、动量吸附、摆动冲量上限、无音频环境下声音静默）。`npm run verify` 119/119（新增单文件：三段内联脚本可解析、无文件或网络引用、样式只用内联 data URL、12 个素材与 3 个模块齐全、小于 16 MB）。
- 单文件以 file:// 在无头 Chrome（GPU、WebGPU）打开：0.4–0.5 s 完成素材解码；光圈、显影、织物、暗盒、两面照片墙 6 个 GPU 场景均为 `webgpu`；31 个组件实例；0 条控制台错误或警告；0 个外部请求；1440 与 375 px 都无横向溢出。
- [交互检查](verification/v1.3.0/interact-results.json) 25/25，真实鼠标、滚轮与键盘事件：
  - ENTER：片头以光圈收拢到按钮，页面落到第一幕标题并聚焦，光圈沿 stage 弹簧连续张开到 0.74。
  - Dialog 从触发按钮以光圈张开；Escape 后先播放退场（仍打开、带 is-closing），约 0.4 s 后关闭，焦点回到按钮。Drawer 点遮罩后先滑出再关闭。Popover 折回后才隐藏。Toast 底线计时在悬停时暂停、离开后继续。Accordion 高度逐帧增长。
  - EditorialTable 排序时同一批行带 FLIP 动画换位；StageTabs 取景框中途拉长（scaleX 1.07–1.16）后落到 200 %；ContactSheet 快速甩动越过多帧后停在整帧上。
  - SilkResonance 快速拖动松手后围绕新张力来回 6–7 次；在回荡中途凝住，250 ms 内张力不变、速度保留，解冻后继续。Range 游标落后于数值再落到 100 %。
  - FilmCanister 拉过尾端超出 112 px 后回弹到端点；向下拖出的一帧先带 is-landing 落桌，约 0.9 s 后结束。
  - FlashlightFocus 三格滚轮：光束只出现在两个固定灯位上，切换时收至 6 % 再张开。PinnedPhotoWall 连按两次下一张：位置单调前进、中途每 25 ms 至少前进 0.03，最终 2.0004（过冲 0.1 %）。
  - 主题按钮切到印纸；减少动态时对话框无动画地打开和关闭；声音开关打开后合成声音可播放。
- 页面回归（HTTP，无头 Chrome，1440 与 375 px）：三幕展示、组件库、追光实验、品牌工坊、最小接入与 ds-viewer 目录全部为 `webgpu`，目录 12 个 GPU 预览，无控制台错误；唯一一条 404 是浏览器自动请求的 /favicon.ico（此前已存在）。目录在 375 px 的 3 px 溢出来自第 20 章一段过长的行内代码，重写该章后为 0。
- 发现并修复：DevelopImage 的 GPU 宿主是 `<span>`，宽高不生效，画布只有约 2 × 2 像素、显示为黑色（旧缺陷，此前的截图多在 GPU 就绪前拍下）；改为块级后显影光斑与漫开都正确。片头最初把宣传片铺满全屏，片中自带的界面文字与大标题相撞；改为带取景角的放映框。
- impeccable 检测：22 条 advisory（10–15 px 的小字号与阴影色，沿用体系既有做法），0 条阻断。
- 截图：[片头](verification/v1.3.0/d-00-prologue.jpg) · [开幕](verification/v1.3.0/d-open.jpg) · [显影](verification/v1.3.0/d-develop.jpg) · [共振](verification/v1.3.0/d-tension.jpg) · [夜场](verification/v1.3.0/d-roll.jpg) · [追光](verification/v1.3.0/d-light.jpg) · [动势](verification/v1.3.0/d-kernel.jpg) · [印纸主题](verification/v1.3.0/i-kernel-paper.jpg) · [375 px 片头](verification/v1.3.0/m-00-prologue.jpg)。检查脚本同目录保存（`OUT=<目录> node interact.mjs`；依赖工作区 `Video Gen/node_modules/playwright-core` 与本机 Chrome）。
- 未覆盖：人耳试听八种声音与宣传片音轨；真实手机触摸（swing 对触屏不触发）；Safari / Firefox（`linear()`、`interpolate-size`、View Transitions 的降级路径只做了代码审查）；WebGL2 与静态降级本轮未强制复测；动效的观感由用户验收。

---

# 1.2.0 · 演示页验证 · 2026-09-29

`dist/catalog/index.html` 改为完整的设计系统演示。

- ds-viewer 新增四项可选功能：`showcase/*.html` 现场演示段、系统自带皮肤 `catalog.css`、封面 `fluid` 标记、标记 `gl` 以及 mp4 / webm 资产播放；另外，带统一前缀的颜色 token 改为合并成一个网格。对照：用改动前后的 ds-viewer 分别重建 Lattice，差异只有新增的三条未使用 CSS 规则和封面函数分支。
- `node tools/build.mjs`：46 个组件、7 章规范、9 段 Showcase。`npm test` 27/27，`npm run verify` 107/107。目录页与全部预览的本地引用都存在（接入段代码示例里的 `overture.css` / `overture.js` 是显示文本，不是链接）。
- 浏览器（Chromium，WebGPU）：
  - 9 个演示框全部加载；三个动作语法、胶卷暗盒、品牌工坊中的 GPU 组件都以 WebGPU 渲染，控制台无错误。
  - 宣传片章节跳转生效。首次测试时本地服务不支持字节范围请求，视频无法跳转；已为 `tools/serve.mjs` 加上 206 分段响应，并补充 mp4 / webm 类型。
  - 暗房的曝光、选片和题名联动正确；光温记录会区分冷光和朱红；三套主题并排显示正确。
  - 侧栏主题按钮能同时切换整页和所有预览。
  - 发现两处问题并已修复：一是 iframe 与页面的配色方案不同，被浏览器画上白底；二是封面自带字标与叠加文字在片尾重叠。
  - 375 px 窄屏无横向溢出。
- 未覆盖：非 Chromium 浏览器、真实手机、`file://` 直接打开时的视频跳转（file 协议本身支持），以及完整的辅助技术验收。

---

# 1.2.0 验证 · 2026-09-29

冷光、夜场主题、胶卷暗盒，以及 dist 自带宣传片。

- `node tools/build.mjs`：46 个组件，ds-viewer 目录显示三套主题（Stage / Paper / Nocturne）和 FilmCanister 卡片。`npm test` 27/27（新增：拉片边界、卷轴转动单调、拖出判定、三主题令牌完整、冷光与正文对比度 ≥ 4.5:1）。`npm run verify` 107/107。
- dist 自包含：所有 HTML 的本地引用都存在；CSS 没有指向 dist 外的路径；宣传片 `dist/assets/video/overture-promo-15s.mp4` 与源文件字节一致。
- 浏览器（Chromium，WebGPU 后端）：
  - 暗盒以 WebGPU 渲染，无控制台错误。横向拖动胶片后拉出长度增加，标签随之转动。
  - 用真实鼠标把一帧向下拖到桌面，它成为带边框的相纸并显影，胶片上留下空位。
  - 首次实测发现：指针一离开胶片就收不到事件，拖出不生效。已把拖动监听改到 window，用合成的"瞬移"拖动复测通过。
  - 事件级测试：拖出、短距离拖动弹回、横向拉片 +180 px、回车冲印、相纸上回车放回、方向键一次拉出一帧，全部符合预期。
  - 主题按钮按暗场 → 印纸 → 夜场循环；品牌工坊「夜场 · 冷光剧场」可以出图；追光光束边缘为冷蓝。
  - 375 px 窄屏无横向溢出。首次发现夜场一幕高度只有 135 px，已加窄屏规则修复。
- 截图：[夜场一幕](verification/v1.2.0/01-nocturne-roll-desktop.jpg) · [拖出成相纸](verification/v1.2.0/02-frame-dragged-to-table.jpg) · [拉片转动](verification/v1.2.0/03-film-pulled-spool-turned.jpg) · [工坊夜场](verification/v1.2.0/04-studio-nocturne.jpg) · [冷光边缘](verification/v1.2.0/05-flashlight-cold-rim.jpg) · [窄屏](verification/v1.2.0/06-roll-mobile-375.jpg)
- 未覆盖：真实手机触摸拖出、非 Chromium 浏览器、WebGL2 与静态降级在本轮未单独强制测试（代码路径沿用既有引擎），也没有做完整的辅助技术验收。视觉效果由用户验收。

---

# 1.1.2 验证 · 2026-09-29

第一组件改为三格滚轮切换一张照片，光束只使用六张照片的固定中心。

- `node tools/build.mjs` 成功生成 45 个组件和 7 章规范；`npm test` 22/22；`npm run verify` 105/105。
- 真实浏览器滚轮输入十五次，选中序列为 `0,0,1,1,1,2,2,2,3,3,3,4,4,4,5`。每次观察的灯位都与对应照片中心完全一致；前两格灯位不动，第三格直接切换。
- 三次反向输入得到 `5,5,4`；末端继续滚动可以离开。390px 窄屏重排后仍准确对准对应照片；生成目录加载新版组件，键盘逐张切换正常。
- [五项有效浏览器观察](verification/v1.1.2/browser-checks.json)通过。另保留一次刷新恢复到暗房的无效试跑：滚轮落点不在组件内，已标记 valid:false，不计为组件结果。
- [桌面截图](verification/v1.1.2/01-six-fixed-light-positions-desktop.png)、[窄屏截图](verification/v1.1.2/02-fixed-light-mobile.png)、[目录截图](verification/v1.1.2/03-catalog-fixed-light.png)。真实手机触摸及其他浏览器未在本轮验收。

---

# 1.1.1 验证 · 2026-09-29

本轮只修改滚动追光、两格一张照片墙和完整相纸换片。原生 HTML/CSS/JS；保留 45 个组件及既有素材。

- 用户确认第一组件为「整面照片墙可见，滚轮推动手电筒光束的位置」。桌面实际滚动前后，六张照片的边界完全相同，光束由 x=0.198 移至 x=0.802，开度保持 25%。
- 第二组件实测：第一格 index=0 / pending=1，第二格 index=1 / pending=0，页面和中央灯位不动；反向两格退回一张，最后一张继续向下可离开。
- 换片时读取到两张完整 figure 和胶片载体的变换；旧、新题名各留在对应相纸。连续三次换片只有两层纸，最终题名、透明度及选中状态一致。自动走片仍前进，减少动态时关闭自动播放并直接换片。
- 390 × 844 窄屏下，六张照片全部在视口内；页面无横向溢出。没有声称真实手机触摸或完整辅助技术验收。
- 目录实测发现 overflow:hidden 裁切层会在聚焦导航按钮时产生 scrollTop=225，导致固定灯层卷动。已改为 overflow:clip，确认聚焦后 scrollTop=0，灯层与视口顶边一致。
- `npm test`：21/21；新增普通鼠标双格、反向重置、触控板累计、大事件上限、行/页单位、抖动及无效值六项测试。
- `node tools/build.mjs`：生成 45 组件、7 规范章节的 ds-viewer；`npm run verify`：105/105，25 项本地资产。最终目录包含本轮新说明，Paper / Stage 下的组件卡可操作。
- [浏览器证据](verification/v1.1.1/browser-checks.json)：15 条通过的定向观察，保留裁切缺陷及修复原因；截图分别记录桌面和窄屏状态，不能替代动作录像或帧率测试。
- [独立复核](verification/v1.1.1/FINISH-REVIEW.md) 判定 ship；其后目录裁切修正由根 agent 定向确认。

[整面照片墙追光](verification/v1.1.1/01-scroll-light-desktop.png) · [两格切换](verification/v1.1.1/02-two-notch-wall-desktop.png) · [整张相纸转场](verification/v1.1.1/03-whole-print-transition-desktop.png) · [窄屏照片墙](verification/v1.1.1/05-scroll-light-mobile.png) · [目录修正](verification/v1.1.1/08-catalog-wall-stage.png)

既有目录自动化的 MutationObserver.observe 参数异常仍未归因，本轮同样记录于 [控制台日志](verification/v1.1.1/catalog-console.json)；未阻断本轮已测卡片。非 Chromium、实体滚轮/触控板的不同硬件设置、真实手机触摸和长时性能未完整覆盖。本轮使用真实浏览器滚轮事件及键盘操作，未以合成 DOM 事件代替用户输入。

---


# 1.1 验证 · 2026-09-29

本轮增量：追光取景、滚动照片墙、自动循环印相和联动暗房。Windows / Codex 内置 Chromium；桌面 1440 × 900，窄屏 390 × 844。以下与文末 1.0 历史记录分开。

- 构建生成 45 个组件、7 章规范、12 色彩令牌、6 文字样式；包含 ds-viewer。
- npm test：15/15，通过既有状态模型与新增镜头路径的边界、连续性、空/单照片测试。
- npm run verify：105/105，检查脚本语法、本地页面资源、组件卡和文档。新图钉后资产清单为 25 项。
- [浏览器记录](verification/v1.1/browser-checks.json)：15 条成功观察，覆盖鼠标灯位、墙面滚动/固定光、暂停/继续、连续换片、键盘选片、分类与底片同步、PNG 导出、无横向溢出、WebGL2、减少动态、CSS 降级和两个目录 iframe。
- 自动循环已观察到从末帧继续到下一轮；浏览器工具的精确帧选择器等待超时，未以该等待作为通过依据。记录保留这个限制，不将其称为精确计时测试。
- 冲印实际下载 overture-darkroom.png，1200 × 1200，PNG 文件约 1.69 MB；照片、题名、曝光和保留项确实影响输出。宣传工坊原有 WebM 不在本轮改动，本轮未重复完整录制验收。
- WebGPU 实际后端为 webgpu；强制 backend=webgl 为 webgl2；backend=static 时 CSS 灯位仍能用方向键移动。减少动态时 ContactSheet data-playing=false。
- 图钉由内置 ImageGen 生成，保存在 project/assets/photos/brass-pin.png。六个图钉图像均实际加载，位置和连线维持一致。它是摄影式生成资产，并非真实采集照片。

[桌面追光](verification/v1.1/01-flashlight-desktop.png) · [桌面照片墙](verification/v1.1/02-wall-desktop.png) · [暗房稳定导出状态](verification/v1.1/03-darkroom-desktop.png) · [第二幕](verification/v1.1/04-contact-desktop.png) · [手机照片墙](verification/v1.1/06-wall-mobile.png) · [手机暗房](verification/v1.1/07-darkroom-mobile.png) · [手机第二幕](verification/v1.1/08-contact-mobile.png)。截图只证明所截状态；交互结论来自操作及 DOM 观察。

目录检查仍记录未归因的 MutationObserver.observe 参数异常，见 [日志](verification/v1.1/catalog-console.json)，没有阻断本次实测卡片。真实手机触摸、Safari/Firefox、完整屏幕阅读器、长时间内存和帧率测试尚未覆盖。光照是 GPU / CSS 遮罩，不是物理光追；图片墙是 DOM 变换，不是完整三维空间。

独立复核的最终结果另见 verification/v1.1/FINISH-REVIEW.md。

---

# 1.0 历史验证 · 2026-09-29

验证环境为本机 Windows、Codex 内置 Chromium 浏览器。桌面视口 1586 × 992，窄屏视口 390 × 844。服务仅绑定 `127.0.0.1:4198`。原生运行时、图像、字体和 three.js 均随项目保存。

## 构建与代码检查

```powershell
node tools/build.mjs
npm test
npm run verify
```

- 构建成功；构建脚本实际调用工作区 `ds-viewer/build.mjs`，生成 43 个组件预览、6 章规范、12 个色彩令牌、6 个文字样式、3 组资产。
- 12/12 行为测试通过：数值边界与步长、分页、标签去重、稳定排序、文件约束、转义、GPU 曲面形变范围和组件登记一致性。
- 98/98 静态检查通过：脚本解析、本地入口与 CSS 资源路径、组件卡和文档、外部运行时依赖检查。24 个资产的哈希在 [assets-manifest.json](verification/assets-manifest.json)。

## 浏览器操作

[browser-checks.json](verification/browser-checks.json) 保留 37 个成功观察和 1 个已被修复记录取代的早期溢出观察，不能把历史失败删除后宣称从未发生。

实际操作覆盖：邮箱错误与纠正；标签页方向键；弹窗保存、Escape 和焦点返回；动作搜索空结果与 Enter 执行；就地设置和 Escape；收藏撤销；大图查看与翻页；数值滑杆及独立数字输出；纸面主题；织物张力、暂停；品牌导出；ds-viewer iframe 内的键盘交互。显影进度 34% 的可见填充宽度实测约 194.77px。

主展示和重建后的织物观察到实际 `webgpu` 后端；强制 `?backend=webgl` 观察到 `webgl2` 且张力、暂停有效。`?backend=static` 保留织物图像。完整动态和减少动态的手机尺寸截图均显示织物。最终桌面和手机的展示、组件库、工坊没有页面级横向溢出。

ds-viewer 的 43 组件、规范、素材和主题入口已在浏览器检查，织物 iframe 可通过方向键从 56 调到 61。目录自动化会话记录了 `MutationObserver.observe` 的 Node 参数异常，见 [原始日志](verification/catalog-console.json)；本项目生成 HTML/JS 中未查到 MutationObserver 调用，来源尚未归因，不能据此宣称整个目录控制台零异常。未观察到它阻断已测试的 iframe 操作。

## 实际文件输出

- [最终织物 PNG](verification/export-resonance-1080x1080.png)：已下载、打开检查，1080 × 1080。
- [最终织物 WebM](verification/export-resonance-1080x1080.webm)：已下载，VP9、1080 × 1080、178 帧，最后画面时间戳 5.900 秒，约 6 秒；无声。
- [竖幅 PNG](verification/export-overture-1080x1350.png)：已下载，1080 × 1350。
- 横幅 1920 × 1080 PNG 也已生成。录制由 MediaRecorder 完成，WebM 可能没有容器 duration 字段；以逐帧时间戳核对时长。没有把 PNG 下载提示当作文件生成的唯一证据。

## 独立视觉复核

最终原词 disposition：**ship**。三轮修复后的判定如下：

| 项目 | 最终判定 |
| --- | --- |
| 共鸣织物材质与放大窗 | Resolved |
| 印纸构图、全景与细节栏 | Resolved |
| 手机织物显示 | Resolved |
| 进度条可见填充 | Resolved |
| 手机组件页溢出 | Resolved |

截图证据：[桌面首屏](verification/desktop-hero.png)、[印纸](verification/desktop-contact.png)、[共鸣](verification/desktop-resonance.png)、[取景放大](verification/desktop-resonance-focus.png)、[手势](verification/desktop-gestures.png)、[手机首屏](verification/mobile-hero.png)、[手机共鸣](verification/mobile-resonance.png)、[减少动态](verification/mobile-resonance-reduced.png)、[手机组件](verification/mobile-components.png)。视觉判定来自代理对截图的复核，不代表用户本人已经验收。

## 覆盖边界

未实测 Safari、Firefox、真实手机或每种 GPU；未作完整屏幕阅读器审计、音色人工试听与长时间性能测试。43 个组件均有实现与文档，交互验证是有代表性的抽查，并非每个组合状态穷举。织物是透明图像细节配合 160 × 100 GPU 曲面变形的 2.5D 方案；不是自由环绕的三维布料模型。示例状态保留于当前页面，正式业务数据与持久化由接入应用负责。

