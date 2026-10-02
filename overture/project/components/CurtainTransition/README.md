# 幕布转场 · CurtainTransition

深红与深蓝两幅幕布从两侧合拢，换幕后分开，避免无意义的漂浮。

## 何时使用

有顺序的页面或叙事段落切换。

## 交互与状态

当前幕、转场、下一幕；减少动态时立即切换。

## 接入

```js
const instance = Overture.mount('CurtainTransition', host, {});
// 监听 instance.element 的 ov:change。移除时调用 instance.destroy()。
```

示例三幕循环；状态变化通过 ov:change 传递。
