# 局部显影 · DevelopImage

GPU 让光斑附近从黑白显影为彩色：光斑带惯性跟随、进出时张缩；选中时显影液从按下的点漫开到整幅。

## 何时使用

照片预览、可选择的视觉内容。

## 交互与状态

移动显影、键盘聚焦从中心漫开、选中/取消、降级。1.3：光斑、漫开都由弹簧驱动，漫开前沿有暖色显影线。

## 接入

```js
const instance = Overture.mount('DevelopImage', host, {});
// 监听 instance.element 的 ov:change。移除时调用 instance.destroy()。
```

src, alt, caption, label；aria-pressed 表示选中。
