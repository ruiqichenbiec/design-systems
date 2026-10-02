定理之瀑：一张依赖图（DAG）按最长路径深度排成瀑布，前提在上、结论在下。每条依赖是一股从前提落进结论的水滴流，背景的雾点持续下落。

## 使用
- 数据：`{ id, en, zh, st, deps, kind, topic }`，`kind` 决定节点形状（foundation 方块、definition 环、theorem 实心圆）。
- `new Cascade({ theorems, depth: depths(), topicOrder })`，放进 `stage`，相机站点 id 用 `fallTop` / `fallBottom`。
- 事件：`hover`（id 或 null）、`pick`（点击的 id）、`frame`（每帧节点的屏幕坐标，用于摆放 DOM 标签）。
- `cascade.focus(id)` 让键盘或列表也能点亮同样的上下游。

## 规则
- 橙色只表示「它需要什么」（上游），冰蓝只表示「它推出什么」（下游），不要互换。
- 文字标签必须是 DOM（`LabelLayer`），并提供一个可键盘访问的完整列表。
