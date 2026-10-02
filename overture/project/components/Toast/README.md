# 可撤销反馈 · Toast

像显影后的印记一样确认动作，并提供撤销。

## 何时使用

轻量、可逆的操作结果。

## 交互与状态

出现、撤销、关闭、超时；悬停/聚焦时保留。1.3：快门式出现与消失；底部细线显示剩余时间，悬停或聚焦时暂停并在离开后继续。

## 接入

```js
const instance = Overture.mount('Toast', host, {});
// 监听 instance.element 的 ov:change。移除时调用 instance.destroy()。
```

示例收藏只保存在组件状态；role=status。
