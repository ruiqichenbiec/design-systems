# 光圈舞台 · ApertureStage

由原始图像资产与 GPU 采样、开度遮罩和视差共同组成。

## 何时使用

整页开幕、品牌片头、进入作品。

## 交互与状态

开度调节、鼠标视差、进入/退回、静态降级。1.3：开度由 stage 弹簧驱动（约 0.83 s），滑杆与滚动联动 snap／settle 跟随，视差带惯性。

## 接入

```js
const instance = Overture.mount('ApertureStage', host, {});
// 监听 instance.element 的 ov:change。移除时调用 instance.destroy()。
```

chrome, value；setValue(0..100)。照片底图不是完整三维剧院。
