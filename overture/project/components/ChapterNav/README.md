# 章节导航 · ChapterNav

有顺序意义的章号成为阅读位置标记。

## 何时使用

分幕长页、作品集章节。

## 交互与状态

当前步骤、聚焦；onSelect 交给应用导航。1.3：朱红下划线按前进方向接力。

## 接入

```js
const instance = Overture.mount('ChapterNav', host, {});
// 监听 instance.element 的 ov:change。移除时调用 instance.destroy()。
```

items, onSelect(index)。
