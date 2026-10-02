# 完整单文件 Showcase

交付日期：2026-09-24。入口：[lens-showcase-standalone.html](lens-showcase-standalone.html)。只需复制这一个 HTML，无须配套目录或网络资源。

**Android 修复（2026-09-24）：** 原先同时初始化 13 个 WebGL 上下文导致前 5 个画布失效。当前按视口共享最多 6 个上下文，Android 平板 Edge 实机回归全部 22 个示例通过，实测最多 3 个活跃上下文。

展示主体直接使用当前 `design-system/examples/optics.html` 的构建结果，保留原布局、原 WebGL2 渲染器、弹簧手势、声音、双语与全部交互。覆盖 18 类公共组件和 4 个数据组合，每个索引锚点均对应实际示例。

独立版把页尾组件目录链接定位到当前页的完整索引；API 阅读入口展示内嵌的完整 README 文本；材质实验室在同一文件的内嵌页面运行，包含原控制中心、组件页签、透镜、材质参数与背景设置。返回展示保留 showcase 状态，关闭实验室时卸载其页面。原始展示页继续保留。

CSS、脚本、SVG 图标、示例数据、API 文本、实验室 HTML 与声音合成代码全部内嵌。实验室的设计灵感链接是可选外部参考，不是运行依赖。WebGL2 不可用时沿用原来的 CSS 降级。

## 构建

从 `lab/` 执行 `node build.mjs`，会在生成原来四个 HTML 后调用 `scripts/build-standalone-showcase.mjs` 生成完整单文件。不要手改生成物。

## 本次验证

- `node --test --test-isolation=none tests/*.test.mjs`：37 项通过，0 失败，包含两项新增的 WebGL 生命周期回归检查。
- `node --check scripts/build-standalone-showcase.mjs`，并将输出中两个可执行脚本分别传入 `node --input-type=module --check`：通过。
- 原 `scripts/check.mjs` 被环境的 `spawnSync EPERM` 阻止；使用上述直接语法检查替代，未宣称原检查命令通过。
- 单文件本机 HTTP 预览：确认 22 个组件／数据示例及索引目标齐全，没有外部脚本、样式或图片依赖；实际检查保存、双语切换、API 阅读、返回时保存状态、内嵌实验室组件页签和回到展示的导航。
- 桌面与窄屏检查：展示沿用原有响应式布局，未出现页面横向溢出。收尾复测发现失效上下文的尺寸更新错误，已在共享渲染器中添加销毁／上下文丢失检查，并在卸载时释放上下文；重新构建后复测实验室导航、双语切换、搜索空状态与恢复、窗口缩放，无新增浏览器错误。原来四个离线页面同步重建。
- 内置浏览器安全策略禁止 `file:` URL，因此没有把双击本地文件列为浏览器实测通过；浏览器实测使用仅提供此 HTML 的本机预览服务。
