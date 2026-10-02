# 空白起点 · EmptyState

空的取景框告诉用户缺少什么、可以怎样开始。

## 何时使用

初次使用、没有作品或搜索无结果。

## 交互与状态

空、添加示例、成功。1.3：加入的照片展开并显影。

## 接入

```js
const instance = Overture.mount('EmptyState', host, {});
// 监听 instance.element 的 ov:change。移除时调用 instance.destroy()。
```

title, message；默认动作加入一个本地示例。
