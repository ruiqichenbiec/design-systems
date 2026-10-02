# 进入按钮 · CueButton

圆形或长条按钮，以快门闭合回应确认，支持异步操作的忙碌与失败反馈。

## 何时使用

主要动作、进入下一幕、提交本地操作。

## 交互与状态

悬停、键盘聚焦、禁用、忙碌和完成。1.3：填充从指针进入处张开，按压 snap 回弹；可选快门声。

## 接入

```js
const instance = Overture.mount('CueButton', host, {});
// 监听 instance.element 的 ov:change。移除时调用 instance.destroy()。
```

label, variant:'circle', disabled, onActivate。
