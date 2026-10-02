# 准备状态 · Loading

缓慢转动的光圈配合内容骨架。

## 何时使用

等待素材或内容的短暂状态。

## 交互与状态

加载、减少动态；状态有文字说明。

## 接入

```js
const instance = Overture.mount('Loading', host, {});
// 监听 instance.element 的 ov:change。移除时调用 instance.destroy()。
```

label；这是展示加载态的组件，完成时由宿主移除。
