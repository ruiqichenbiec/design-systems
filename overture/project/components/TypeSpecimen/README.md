# 字体编排 · TypeSpecimen

展示标题与中文正文共同工作的比例。

## 何时使用

建立跨语言的标题／正文层级。

## 交互与状态

长标题换行、窄屏缩放。

## 接入

```js
const instance = Overture.mount('TypeSpecimen', host, {});
// 监听 instance.element 的 ov:change。移除时调用 instance.destroy()。
```

text；字体本地托管，中文使用本机字库。
