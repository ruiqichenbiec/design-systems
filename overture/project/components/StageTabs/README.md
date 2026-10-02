# 幕次标签页 · StageTabs

朱红取景框是一个弹簧：按速度拉长、带轻微过冲落定；面板按切换方向展开。

## 何时使用

同一上下文中的内容切换。

## 交互与状态

选中、非选中；左右、Home、End 键；原生 tablist 语义。连续切换保留取景框速度；减少动态时直接落位。

## 接入

```js
const instance = Overture.mount('StageTabs', host, {});
// 监听 instance.element 的 ov:change。移除时调用 instance.destroy()。
```

items, panels, label；setValue(index)。
