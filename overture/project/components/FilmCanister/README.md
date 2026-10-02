# 胶卷暗盒 · FilmCanister

三维 35 mm 暗盒里拉出一卷胶片：横向拖动拉出或卷回，卷轴随之转动；把一帧向下拖出，它会作为相纸落到桌面并显影。

## 何时使用

作品集入口、系列浏览、从一组照片中挑选并收藏若干张。

## 交互与状态

拖动／滚轮／方向键拉片，放手后带惯性；悬停冷光取景并显色；向下拖出成相纸，未到桌面则弹回原位；桌面相纸可拖动摆放，双击、回车或退格放回胶片；空位显示为透明片基；WebGPU / WebGL2 暗盒与 CSS 静态暗盒降级；减少动态时无惯性、无显影动画。1.3：拉过两端有橡皮筋阻力并回弹，甩到尽头会弹回；相纸落桌以 settle 弹簧定位、snap 弹簧转正，并有一次落地压缩；方向键拉片走弹簧。

## 接入

```js
const instance = Overture.mount('FilmCanister', host, {});
// 监听 instance.element 的 ov:change。移除时调用 instance.destroy()。
```

items:[[file,title,category]], roll:'ROLL 01', dates:'FEB 2026 — JUN 2026', pulled:3.2（初始拉出帧数）；setValue(0..100) 设置拉出长度；ov:change 返回 pull、turn、out（已冲印的帧序号）。
