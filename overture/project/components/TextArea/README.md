# 创作笔记 · TextArea

多行文字与字数余量，让长表达仍保持简洁。

## 何时使用

说明、创作手记、反馈。

## 交互与状态

空、输入、长度上限、可调整高度。

## 接入

```js
const instance = Overture.mount('TextArea', host, {});
// 监听 instance.element 的 ov:change。移除时调用 instance.destroy()。
```

label, value, placeholder, maxLength；setValue(text)。
