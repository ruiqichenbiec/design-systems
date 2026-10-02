标签页的指示器是一个 14×2 的点群。切换时点群按顺序松开，带着一小段湍流流向新的标签。

## 使用
- 标准 `role="tablist"` / `role="tab"` 结构；`mountTabs(listEl)`，方向键切换。
- 事件：`tabs:change`（`detail.index`、`detail.value`）。
