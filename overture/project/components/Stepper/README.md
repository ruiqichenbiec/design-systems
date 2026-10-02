# 数量步进 · Stepper

翻片式数字窗口配合有边界的加减，立即回应数量或底片切换。

## 何时使用

印刷份数、数量、分段级别。

## 交互与状态

值变化、边界禁用、屏幕阅读器播报。1.3：翻片按增减方向转动。

## 接入

```js
const instance = Overture.mount('Stepper', host, {});
// 监听 instance.element 的 ov:change。移除时调用 instance.destroy()。
```

min, max, value, label；setValue(number)。
