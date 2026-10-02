# 辅助提示 · Tooltip

悬停和键盘聚焦时提供简短的动作说明。

## 何时使用

解释图标；必要信息不可只放提示内。

## 交互与状态

悬停、聚焦、离开；aria-describedby。

## 接入

```js
const instance = Overture.mount('Tooltip', host, {});
// 监听 instance.element 的 ov:change。移除时调用 instance.destroy()。
```

text；不装载复杂交互内容。
