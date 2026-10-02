# 图标按钮 · IconButton

以单一细线图标表达可反复切换的动作。

## 何时使用

收藏、锁定、静音等可逆动作。

## 交互与状态

aria-pressed 双态、焦点、禁用。1.3：悬停填充从指针处张开，按下时图标像印章压下。

## 接入

```js
const instance = Overture.mount('IconButton', host, {});
// 监听 instance.element 的 ov:change。移除时调用 instance.destroy()。
```

label, icon, value, disabled；setValue(boolean)。
