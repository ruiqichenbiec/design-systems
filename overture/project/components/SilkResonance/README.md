# 共振褶皱 · SilkResonance

透明织物图像映射到细分曲面；张力是一根轻阻尼弹簧，松手后带着速度回荡，凝住会停在回荡中途。

## 何时使用

品牌主视觉、交互雕塑、参数化艺术。

## 交互与状态

拖动、张力、键盘、持续运动、凝住、下载、降级。1.3：resonance 弹簧（k 140 · c 3.2，周期 0.53 s）；凝住冻结位移与速度，继续时同一次回荡接着走。

## 接入

```js
const instance = Overture.mount('SilkResonance', host, {});
// 监听 instance.element 的 ov:change。移除时调用 instance.destroy()。
```

value, chrome；setValue(0..100)；WebGPU 优先、WebGL2 回退。
