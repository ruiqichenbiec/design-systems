# 品牌工坊 · BrandComposer

同一视觉体系内编辑内容、画幅、动势并导出。

## 何时使用

网页横幅、竖幅海报、方形品牌宣传。

## 交互与状态

编辑、画幅/场景切换、PNG、6 秒 WebM、错误反馈。1.3：换画幅时预览从旧画框变形到新画框，换视觉语言时显影。

## 接入

```js
const instance = Overture.mount('BrandComposer', host, {});
// 监听 instance.element 的 ov:change。移除时调用 instance.destroy()。
```

title, subtitle；导出全在本机，无网络上传。
