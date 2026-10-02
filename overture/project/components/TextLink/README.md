# 文字链接 · TextLink

细规则线与箭头形成不抢占图像的次级入口。

## 何时使用

阅读更多、查看说明、进入详情。

## 交互与状态

悬停、焦点；提供 href 时为真实导航。

## 接入

```js
const instance = Overture.mount('TextLink', host, {});
// 监听 instance.element 的 ov:change。移除时调用 instance.destroy()。
```

label, href；不提供 href 时为示例状态。
