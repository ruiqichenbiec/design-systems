# 透镜 Lens · v1.1.0-showcase.1

实际可交互的玻璃组件、材质、弹性手势与声音，整理成原生 Web 设计系统。所有可交互的部分都由同一个透镜承载：玻璃承载信息，液体表达连续变化，光表达状态。

## 开始使用

- **完整单文件展示**：[lens-showcase-standalone.html](lens-showcase-standalone.html)。只需这一个文件，包含全部 18 类组件、4 个数据组合、双语、光学材质与声音，并内嵌完整材质实验室和 API 文本。构建说明见 [STANDALONE.md](STANDALONE.md)。
- **展示网页**：[中文](lens-showcase.html) · [English](lens-showcase-en.html)。可以体验材质、基础控件、光学交互、折线 / 柱形 / 环形图和联动表格，并试听摩擦声、调节静音和音量。
- **材质实验室**：[中文](lens.html) · [English](lens-en.html)。
- **系统范围与复用规范**：[核心元素、透镜承载、反馈方式和组件准入](lab/design-system/SCOPE.md) · [统一术语](lab/design-system/CONTEXT.md) · [交互说明](lab/design-system/INTERACTIONS.md) · [展示页说明](lab/design-system/SHOWCASE.md)。
- **设计系统目录**：进入 `lab/`，执行 `npm start`，打开 `http://127.0.0.1:4173/design-system/index.html`。只需 Node.js，没有运行时依赖。
- **可复用的包**：`lab/design-system/` 可单独复制使用，包含 18 类公共组件、13 种原创短音效、连续摩擦音、CSS / JSON 变量、TypeScript 类型和扩展接口。完整说明见 [README](lab/design-system/README.md)，设计规则见 [DESIGN](lab/design-system/DESIGN.md)。

ES module 组件目录与示例需要 HTTP 静态服务。展示页与实验室的 HTML 已包含全部运行代码，核心交互无网络依赖。

## Contents

`lab/design-system/` is the portable package. Copy it into any static website or install it as a local ESM package. It includes material presets, semantic controls, elastic gestures, original synthesized audio, design tokens, TypeScript declarations, a bilingual live catalog and working integration examples. Runtime dependencies: none.

The accompanying lab consumes the same core implementation. Run `npm test`, `npm run build` and `npm run check` from `lab/`.

Refraction samples the system canvas, not arbitrary DOM or third-party pages.
