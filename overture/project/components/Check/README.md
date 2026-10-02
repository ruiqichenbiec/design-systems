# 复选框 · Check

精确的直角边框与短促落位的确认标记。

## 何时使用

多选、偏好、局部开关。

## 交互与状态

选中、未选中、禁用、聚焦。1.3：勾一笔画出，方框以 snap 弹簧转正。

## 接入

```js
const instance = Overture.mount('Check', host, {});
// 监听 instance.element 的 ov:change。移除时调用 instance.destroy()。
```

label, value, disabled；setValue(boolean)。
