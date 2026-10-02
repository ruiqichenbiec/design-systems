# 就地选项 · Popover

在触发点旁展开少量设置，不打断页面。

## 何时使用

取景、筛选与局部偏好。

## 交互与状态

展开、关闭、外部点击、Escape、选项改变。1.3：从触发按钮张开，关闭时先折回再隐藏。

## 接入

```js
const instance = Overture.mount('Popover', host, {});
// 监听 instance.element 的 ov:change。移除时调用 instance.destroy()。
```

示例包含两个原生复选框；事件含 option/value。
