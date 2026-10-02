---
name: "序曲 · Overture"
description: "由光圈剧场、编辑底片与共振褶皱组成的本地视觉与交互体系。"
colors:
  stage-bg: "#0c0a09"
  stage-surface: "#191411"
  stage-text: "#f1ebdf"
  stage-muted: "#b9ada0"
  stage-accent: "#ff6654"
  stage-oxblood: "#5f1017"
  stage-line: "#66574b"
  stage-line-soft: "#3d312a"
  stage-cold: "#8fb1ff"
  stage-indigo: "#1c2a55"
  stage-focus: "#9dbcff"
  stage-success: "#bad1ad"
  stage-warning: "#efc68f"
  paper-bg: "#eee8dc"
  paper-surface: "#e5ddce"
  paper-text: "#211a16"
  paper-muted: "#65584d"
  paper-accent: "#a02b1d"
  paper-oxblood: "#69151c"
  paper-line: "#a39483"
  paper-line-soft: "#cfc2b1"
  paper-cold: "#1f4a8f"
  paper-indigo: "#23386b"
  paper-focus: "#1d4a92"
  paper-success: "#385328"
  paper-warning: "#785021"
  nocturne-bg: "#0a0f1f"
  nocturne-surface: "#121a31"
  nocturne-text: "#eceff6"
  nocturne-muted: "#a9b3cb"
  nocturne-accent: "#ff6654"
  nocturne-oxblood: "#5f1017"
  nocturne-cold: "#9dbcff"
  nocturne-indigo: "#2a3c78"
  nocturne-line: "#3e4b75"
  nocturne-line-soft: "#243056"
  nocturne-focus: "#9dbcff"
  nocturne-success: "#b6d3bf"
  nocturne-warning: "#efc68f"
typography:
  display:
    fontFamily: '"Bodoni Moda", "Times New Roman", "SimSun", serif'
    fontSize: "clamp(42px, 7vw, 110px)"
    fontWeight: 400
    lineHeight: 0.9
    letterSpacing: "-0.04em"
  body:
    fontFamily: '"Manrope", "Microsoft YaHei", sans-serif'
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: '"Manrope", "Microsoft YaHei", sans-serif'
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "0.12em"
  caption:
    fontFamily: '"Manrope", "Microsoft YaHei", sans-serif'
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.65
rounded:
  print: "0px"
  action: "50%"
spacing:
  compact: "8px"
  related: "12px"
  control: "16px"
  group: "24px"
  panel: "48px"
components:
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.stage-text}"
    rounded: "{rounded.print}"
    padding: "13px 23px"
  button-solid:
    backgroundColor: "{colors.stage-text}"
    textColor: "{colors.stage-bg}"
    rounded: "{rounded.print}"
    padding: "13px 23px"
  button-circle:
    backgroundColor: "transparent"
    textColor: "{colors.stage-text}"
    rounded: "{rounded.action}"
    padding: "20px"
    width: "112px"
    height: "112px"
  field:
    backgroundColor: "transparent"
    textColor: "{colors.stage-text}"
    rounded: "{rounded.print}"
    padding: "12px 32px 12px 0"
  tag:
    backgroundColor: "transparent"
    textColor: "{colors.stage-text}"
    rounded: "{rounded.print}"
    padding: "5px 10px"
---

# Design System: 序曲 · Overture

## Overview

**Creative North Star: "光、情绪与形式的三幕印象"**

以用户认可的三张参考图为视觉权威：近黑光圈剧场、象牙印纸上的底片档案、带红色缝线的半透明褶皱。保留巨大高对比衬线字、直角相纸、极细规则线与摄影取景角；图像负责材质细节，控件负责可读的操作状态。工作名 Overture 不代表已确认的商业品牌。

展示页采用 Experience 的大字、叠层与整幕图像；组件库与品牌工坊采用 Operate / Read 的细线、网格与清楚标签。二者共享 Stage / Paper / Nocturne 三套主题、字体与三个动作语法：开幕／遮挡、聚焦／显影、张力／凝住。字体、库和示意图随包保存；摄影内容是 AI 生成素材。

1.1.2 的追光页延伸“聚焦／显影”：完整六张照片保持固定可见，每三格滚轮将光束切换到下一张照片中心，灯位只有六个固定位置；另一面墙的光束停在中央，两格滚轮驱动照片与红线穿过光区。其暖黑、褐纸、象牙相纸和朱红连线属于摄影场景的材质处理；工作界面的语义主题仍由 Stage / Paper 令牌控制。

1.2.0 加入第二种光温。冷光（`ov-cold`）标记光与注意力落下的位置：聚焦、悬停取景、光束边缘和信息提示；深蓝丝绸（`ov-indigo`）与深红成对。第三主题 Nocturne · 夜场以午夜蓝为底，朱红仍只表示动作。新组件 FilmCanister 把一卷胶片从三维暗盒里拉出，照片可以被拖出成相纸。

1.3.0 让三个动作语法各有一个运动原语：开幕是光圈，显影是显影，共振是弹簧。所有组件的动态都由 `Overture.motion` 驱动，可打断、承接速度、可冻结；可选的合成声音只跟随有意义的动作。单文件演示页 `dist/overture-showcase.html` 把整套体系装进一个离线 HTML。

**Key Characteristics:**

- 近黑舞台、温暖印纸与午夜蓝夜场三套主题；朱红标记操作，冷光标记聚焦，深红与深蓝承载丝绸。
- Bodoni Moda 建立展示尺度，Manrope 与中文系统字体承担阅读。
- 相纸与工具为直角；圆形用于进入、拍摄和连续控制。
- 动效回应状态，由同一个运动核心（光圈、显影、弹簧）承担；可打断、承接速度、可冻结，并尊重减少动态偏好。
- 光束与相纸使用真实输入驱动；照片墙保留图钉、连线与首尾的原生滚动出口。

记录依据：`project/tokens.json`、`src/components.css`、`src/showcase.css`、`src/motion.css`、`src/contact.js`、`src/light.js`、`src/engine.mjs`、`src/light-studies.*` 与组件登记表。前置方向已与实际构建合并，页面专属构图不提升为全系统规则。

## Colors

Stage 温暖近黑，Paper 温暖象牙，Nocturne 午夜蓝；所有主题颜色沿用源码的十六进制值，主题切换由同名 `--ov-*` 变量完成。

### Primary

- **朱红校样**：`*-accent` 用于选中边、进度、滑杆与错误提示，三套主题中意义不变。状态同时有文字或语义标记。
- **冷光**：`*-cold` 与 `*-focus` 是第二光温，用于键盘聚焦、悬停取景角、输入聚焦、光束边缘、开关的关闭窗、加载与信息提示。冷光只表示"光落在这里"，不承担确认或选中。

### Secondary

- **深红丝绸**：`*-oxblood` 对应幕布与布料的材质世界；照片中的红色有自己的明暗，不用单一色块替代织物。
- **深蓝丝绸**：`*-indigo` 与深红成对，用于幕布转场的另一层、暗盒标签底带等材质面；不作正文色。

### Neutral

- **舞台 / 印纸底色**：`*-bg` 是页面底色，`*-surface` 是局部输入与展开面。
- **象牙 / 墨色文字**：`*-text` 用于标题与主要信息，`*-muted` 用于可读的次级说明。
- **控件线 / 装饰线**：`*-line` 界定操作边界，`*-line-soft` 分隔相邻内容；二者不混用。
- **完成 / 提醒**：`*-success` 与 `*-warning` 是有限的语义反馈色，不作为新的品牌主色。

**The Proof Mark Rule.** 朱红指向动作、选择或状态；大面积红色来自摄影材质和幕布。

**The Two Temperatures Rule.** 暖光照亮内容，冷光勾出边缘与焦点。悬停取景是冷光，选中后变朱红；同一元素不同时使用两种强调色。

**Nocturne.** 夜场与暗场结构相同，只把底色、面、线和次级文字换成午夜蓝体系。摄影布景自身的暖黑背景（光圈剧场、织物、照片墙）在三套主题下保持不变。

追光与暗房的 `#100d0a`、`#14100c`、`#282219`、`#d9ceba`、`#f5efdf` 等暖光／纸色在 `src/motion.css` 和 `src/light-studies.css` 中服务具体摄影布景。它们不替换 `project/tokens.json` 的 Stage / Paper 背景、正文、焦点及反馈色，也不提升为新的语义主题令牌。

## Typography

**Display Font:** Bodoni Moda，回退 Times New Roman / SimSun / serif。  
**Body Font:** Manrope，中文回退 Microsoft YaHei / sans-serif。

**Character:** 高对比细衬线制造舞台尺度，清楚的无衬线承担控制；英文展示字与中文说明保留各自的阅读节奏。Bodoni Moda 400、Manrope 400 / 600 均自托管，中文依赖本机字库。

### Hierarchy

- **Display**：品牌字标采用 frontmatter 的响应式尺度。三幕展示标题另按视口宽度扩大，允许超过通用标题上限；这是参考图确定的展示语言。
- **Headline**：导出的 section 样式为 clamp(30px, 4vw, 54px) / 1.05；工具页标题与弹层标题按空间缩放，仍保持普通字重。
- **Body**：实际组件基准为 frontmatter 的 body；长说明常用 12–14px、较宽行距，示例说明限制约 43–64ch。导出的 `ov-type-body` 阅读工具类另为 16px / 1.75。
- **Label**：按钮与导航采用普通字重、疏字距；强调字段与导出的 label 工具类另用 600。字号随表面密度变化，不把展示页微小装饰文字作为通用操作文字标准。
- **Caption**：图片说明、帮助与状态采用更小的 sans 角色，保留与主体的层级。

**The Two Voices Rule.** 衬线负责标题、字标与少量数值；表单、导航和反馈使用 sans。

## Layout

展示页采用整幕图像和叠层编辑构图，横向留白通常为视口的 3.6%；工具页为 4%，窄屏统一增至 6%。组件库桌面是 200px 侧栏与两列样本，宽组件跨列；900px 以下减为单列样本，600px 以下侧栏变为可换行筛选入口。品牌工坊桌面预览／表单分列，650px 以下上下排列。

追光页由固定的六张照片与移动光束、两格滚轮照片墙、暗房操作台连续组成。`FlashlightFocus` 提供容器与整页模式，每三格滚轮将光束切至下一张照片的固定中心，键盘、前后按钮和单次触屏滑动同样可用。`PinnedPhotoWall` 的中央光束固定，整页模式只占一屏；滚轮每两格推进一张，触控板小增量可累积，照片、图钉与红线在 780ms 运镜中穿过光区。首尾向外滚动正常离开；窄屏保留索引与前后按钮。暗房操作台桌面分列、750px 以下上下排列。

以 4px 基础网格组织空间，frontmatter 只保留反复出现的间距。细线连接相邻区块，较大的空白分开章节。底片保留横向滚动；表格在自身容器中滚动，页面不依赖横向溢出来保留桌面布局。

**The Surface Mode Rule.** 展示面可以叠图与放大字；工作面必须留出完整标签、控件与状态的操作空间。

## Elevation & Depth

大多数工具平面由底色、细线和前后遮挡形成深度；阴影集中在抽出的相纸与浮层。Stage / Paper 的 `ov-print-shadow` 为现有主题阴影，完整值记在 sidecar。相纸另有柔和落影；模态背景退暗并轻微模糊。织物深度来自图像已有的褶皱与 GPU 曲面视差，不应据此推导出通用玻璃或立体卡片样式。

追光层以透明 TSL 遮罩压暗照片周边，并用暖色边缘表达光束；真实照片仍是可访问的 DOM `img`。GPU 优先 WebGPU、回退 WebGL 2；初始化失败时 `src/motion.css` 的 CSS 径向遮罩接替。光照按输入或尺寸变化绘制，DPR 上限 1.25，静止与离屏不维持连续绘制。这是视觉遮罩，不是射线追踪或体积光模拟。

**The Print Lift Rule.** 阴影表达抽出、遮挡或浮层关系，静态工具区块依靠线与色阶区分。

## Shapes

直角用于相纸、输入、按钮长条、弹层和海报。圆形保留给 ENTER、播放动作、滑杆点与追光开度；Switch 使用直角机械拨杆与朱红状态窗。1px 细线、取景四角与校样十字来自摄影／编辑世界，不是禁止使用的装饰。图标使用内联细线 SVG。照片墙的 `brass-pin.png` 是随包保存的 ImageGen 透明摄影栅格素材；图钉不是 CSS 绘制的通用令牌。

## Motion

**The One Kernel Rule.** 组件不自带缓动或回弹。开幕／遮挡用 `iris()`，聚焦／显影用 `develop()`、`flip()`、`count()`，张力／凝住用 `spring()`；CSS 只用 `--ov-ease`、`--ov-exit` 与由弹簧生成的 `--ov-spring`、`--ov-settle`。

| 预设 | 常数 | 静止 | 用于 |
| --- | --- | --- | --- |
| snap | k 600 · c 36 | 340 ms，过冲约 3 % | 拨杆、勾选、刻度针、取景框、按压、翻片 |
| settle | k 120 · c 20 | 570 ms | 相纸落位、底片带、FLIP、灯箱、侧幕 |
| stage | k 52 · c 13.2 | 830 ms | 光圈开幕、照片墙运镜 |
| resonance | k 140 · c 3.2 | 周期 0.53 s | 丝绸松手后的回荡 |
| swing | k 36 · c 1.8 | 周期 1.05 s | 图钉相纸被拂过后的摆动 |

- 浮层从请求它的控件张开，并按原路退回；离开约为进入的 0.6 倍时长并加速离场。所有关闭路径（按钮、Esc、遮罩、保存）共用同一次退场。
- 只有真实材料才欠阻尼：丝绸和挂着的相纸会回荡，控件只有约 3 % 的过冲，镜头与相纸不回弹。不要为装饰使用 bounce / elastic。
- 连续输入重设弹簧目标，不重新起步；冻结保留位移与速度。数值、ARIA 和输出始终是真实值，弹簧只负责它的画面。
- 声音默认关闭，打开后按元素水平位置左右声像；不自动播放，不替代视觉或文字反馈。
- 减少动态时弹簧直接落位，光圈与显影跳过，循环停止；照片墙、追光这类空间切换改为 `dissolve()` 淡出淡入，不直接跳换。

## Components

登记表包含 **46 个组件、7 个家族**：动作与导航、表单与选择、浮层与披露、反馈与进度、内容与数据、影像与 GPU、品牌与版式。配套接入规则分为 **7 章**。完整参数以登记表与公开 API 为准，下面记录可迁移的视觉行为。

### Buttons

长条按钮以细边框开始，由触发点展开圆形填充；实色按钮从文字色底切换到朱红。1.3 起图标按钮、单选压印也从指针进入处张开，按压时以 snap 弹簧回弹。圆形 ENTER 桌面为 frontmatter 的尺寸，窄屏缩为 90px。默认长条最小高度 48px，图标动作约 44px。键盘焦点为 2px 聚焦色轮廓、5px 外偏移；禁用态降低透明度并阻止操作。

`CueButton` 在确认时以朱红快门遮罩闭合；异步 `onActivate` 期间使用禁用与 `aria-busy`，失败给出可读反馈，再恢复操作。

### Chips

关键词为紧凑直角细线标签，悬停时线和字转朱红。单选组以整块文字色／底色反转标示选中；状态通过原生 input 保留键盘路径。

### Cards / Containers

组件样本是有顶部分隔线的开放区块；相纸才使用实体纸边、轻微倾斜和阴影。弹层采用主题底色与可见边线，保持直角；侧幕和对话框沿用原生 dialog 的焦点管理。

### Inputs / Fields

输入框采用透明底、单条底线、完整可见标签；聚焦时红色取景角落位，错误说明贴近字段。选择器保留原生行为；`Range` 在原生滑杆上叠加 21 格曝光刻度和红色游标，保留键盘调整与数值输出。`Switch` 使用有 I/O 标记的机械滑片与状态窗；`Stepper` 的有界数值以翻片动作更新，减少动态时直接换值。进度以 3px 轨道中的红线显示，同时给出数值、阶段和暂停入口。

### Navigation

`StageTabs` 以移动的朱红取景四角框定当前项，面板随遮罩展开；原生 tablist 语义与左右、Home、End 键保持选项和焦点一致。章节导航由衬线章号配合 sans 标签组成。工具侧栏以朱红当前项连接筛选结果。展示页导航在窄屏精简，工具导航仍提供完整功能入口。

### Signature imagery

- **ApertureStage**：本地照片由 GPU 采样、圆形开度遮罩和细小视差组成；可调开度、进入／退回，失败时保留静态图片。它不是完整三维剧院。
- **ContactSheet / DevelopImage**：底片选中后，整张彩色相纸入场；局部显影 shader 将光标附近变为彩色，键盘聚焦可全显影，选中锁定结果。
- **ContactSheet 自动走片**：默认每 4800ms 前进一帧，红色焦点随连续循环的底片移动，齿孔与胶片带共同移动。两层完整 `figure` 让图像、相纸边框、题名和套准标记作为整体以 1050ms 入场、700ms 出场；胶片托架另用 1000ms 机械回位。可暂停／继续、上／下一张、拖动、左右及 Home/End 键。悬停底片或相纸、照片获得键盘焦点、离屏、页面隐藏或减少动态时停走；自动换片不移动焦点，也不触发状态播报。新输入会取消并接替未完成的相纸动画。
- **FlashlightFocus**：六张 DOM 照片固定可见；前两格滚轮分别显示 1/3、2/3 且保留灯位，第三格直接切至下一张照片中心，仅有六个固定灯位。反向输入重计，首尾向外滚动释放页面。开度独立调整；前后按钮、方向键、Page Up/Down、Home/End 和单次触屏滑动逐张切换。page 模式占一屏；指针移动不控制灯位。
- **PinnedPhotoWall**：中央光束固定，照片、图钉与红线按当前相机位置移动。普通滚轮第一格显示 `1 / 2` 半步反馈，第二格启动 780ms 运镜；小幅触控板增量累积，反向输入清除旧方向半步，单个大事件至多计一格。连续输入从当前相机位置接替运镜；首尾向外滚动释放给页面。整页模式只占一屏；按钮、键盘、索引和触屏滑动可逐张切换，减少动态时直接落位。
- **SilkResonance**：透明高细节织物图像贴在 **160 × 100 分段的可变形平面**上。张力改变网格，TSL 位移与有限转角产生实时视差；材质采用透明 MeshBasicNodeMaterial，图像承载已绘制的褶皱与光照。这是 **2.5D 纹理曲面**，没有完整三维布料、物理模拟或可自由绕行的背面。放大镜读取源纹理局部，不是变形后几何的实时放大。
- **FilmCanister**：WebGPU / WebGL2 渲染的 35 mm 暗盒（标签、金属唇口、卷轴头、遮光绒），胶片从右侧拉出。横向拖动、滚轮或方向键拉片，放手后带惯性，卷轴与标签随拉出长度转动。把一帧向下拖出，它会带着象牙边框成为相纸，落到桌面后显影；没到桌面就弹回原位。桌面相纸可以拖动摆放，双击、回车或退格放回胶片。GPU 不可用时用 CSS 暗盒代替。1.3：两端橡皮筋（最多 140 px）并回弹，甩到尽头会弹回；相纸落桌时位置走 settle、角度走 snap，并有一次落地压缩。
- **1.3 动态**：DevelopImage 的显影光斑带惯性跟随、进出时张缩，选中时显影液从按下点漫开（前沿有一道暖色显影线）；SilkResonance 的张力是 resonance 弹簧，松手回荡、凝住停在回荡中途；FlashlightFocus 前两格转动准星，第三格光束沿 settle 弹簧移到下一张照片中心，途中收窄、到达后张开，只在六个固定灯位停留；PinnedPhotoWall 的运镜走 stage 弹簧，连续输入不中途停顿，移动时略后退、到达时推近；两面照片墙的相纸被拂过时绕图钉摆动；ContactSheet 底片带 1:1 跟手并按速度吸附。
- **BrandComposer**：同一套四种视觉语言（新增「夜场 · 冷光剧场」）提供横幅 1920×1080、海报 1080×1350、竖屏 1080×1920 与方形 1080×1080，编辑后本地导出 PNG；浏览器支持时录制 6 秒无声 WebM。
- **Darkroom 操作台**：`StageTabs`、`Range`、`Stepper`、`TextField`、`Switch`、`Check`、`CueButton` 共控同一张相纸的图像、曝光、题名、取景线与手记。快门确认后本地导出 **1200 × 1200 PNG**，并把缩略印相放进本页纸托；页面重载后状态重置。

GPU 使用本地 three.js 0.186.1，优先 WebGPU、回退 WebGL2，初始化失败进入静态模式。追光的 CSS 遮罩在 GPU 失败时仍可随输入操作；它不替代 SilkResonance 等组件各自的静态降级。连续运动可凝住；系统减少动态时停止持续动画、立即更新操作状态，也可由用户显式启用完整动态。组件销毁协议释放监听器、定时器、GPU 资源、对象 URL 和音频上下文。

## Do's and Don'ts

### Do:

- **Do** 沿用三张参考图的材质、巨大衬线与相纸语法，再按展示或工作场景调整密度。
- **Do** 将开幕、显影与张力映射到可说明的操作或状态。
- **Do** 为指针交互保留键盘／触摸入口，并保留聚焦、暂停与静态降级。
- **Do** 让自动走片在离屏、页面隐藏、悬停、照片聚焦与减少动态时停走；让两个照片墙首尾的页面滚动保持可用。
- **Do** 在导出和展示中标识 AI 示意素材，准确说明 GPU 图像与曲面的边界。
- **Do** 让新组件的动态只调用 `Overture.motion` 的三个原语和五种弹簧，让浮层从触发它的控件张开并退回。

### Don't:

- **Don't** 把直角相纸与开放区块改成通用圆角卡片。
- **Don't** 用纯色或光滑程序波纹替代织物的摄影细节。
- **Don't** 只依赖朱红传达错误、选中或完成。
- **Don't** 把纹理已有的光照、局部放大或有限视差宣称为物理布料模拟或完整三维摄影。
- **Don't** 把追光透明遮罩称为照片的射线追踪，也不要把 `brass-pin.png` 的摄影材质解释成 CSS 程序绘图。
- **Don't** 为单个组件另写缓动或回弹；追光可以在两个灯位之间移动，但不要停在灯位以外的位置。

未规范化：展示页少量极小的大写装饰字与弯箭头字形是既有画面的一部分，不作为未来界面的操作文字／图标标准；追光页的布景专用色和摄影图钉不成为新语义主题或通用 CSS 材质。
