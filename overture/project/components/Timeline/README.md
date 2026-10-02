# 幕次时间线 · Timeline

舞台提示单的时间和事件组成清楚的顺序。

## 何时使用

活动安排、制作过程、作品历程。

## 交互与状态

顺序语义；每项都有时间、标题、补充说明。

## 接入

```js
const instance = Overture.mount('Timeline', host, {});
// 监听 instance.element 的 ov:change。移除时调用 instance.destroy()。
```

items:[[time,title,description]]。
