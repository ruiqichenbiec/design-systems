# 显影比较 · CompareLens

同一图像的黑白和彩色由一条可控分界线比较。

## 何时使用

前后对比、调色说明、工艺变化。

## 交互与状态

拖拽、键盘、分界值说明。1.3：分界线以 snap 弹簧跟随。

## 接入

```js
const instance = Overture.mount('CompareLens', host, {});
// 监听 instance.element 的 ov:change。移除时调用 instance.destroy()。
```

src；setValue(0..100)；原生 range 控制。
