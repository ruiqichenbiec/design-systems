# 品牌字标 · Wordmark

大尺度高对比衬线字标，配合克制的落款。

## 何时使用

页首、封面与品牌署名。

## 交互与状态

响应式缩放；保持足够留白。

## 接入

```js
const instance = Overture.mount('Wordmark', host, {});
// 监听 instance.element 的 ov:change。移除时调用 instance.destroy()。
```

name, tagline；默认名称是本体系工作名。
