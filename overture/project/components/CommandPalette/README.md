# 动作搜索 · CommandPalette

集中寻找动作，保留可见结果和键盘路径。

## 何时使用

工具密集页面的快捷导航。

## 交互与状态

搜索、有结果、空结果、当前结果、执行、关闭。1.3：从触发按钮以光圈张开并退回；结果逐项显影（最多六项）；Escape 同样有退场。

## 接入

```js
const instance = Overture.mount('CommandPalette', host, {});
// 监听 instance.element 的 ov:change。移除时调用 instance.destroy()。
```

actions:[{label,value}], onSelect；上下键/Enter/Escape。
