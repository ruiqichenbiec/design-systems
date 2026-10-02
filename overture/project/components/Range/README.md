# 曝光滑杆 · Range

镜头式刻度与朱红游标表达连续数值；游标像表针一样带质量跟随，保留原生滑杆与键盘调节。

## 何时使用

曝光、音量、开度、材质强度。

## 交互与状态

拖拽、聚焦、键盘、最小最大、数值输出。游标跟随为视觉，数值输出始终精确；越过刻度有齿感声（可选）。

## 接入

```js
const instance = Overture.mount('Range', host, {});
// 监听 instance.element 的 ov:change。移除时调用 instance.destroy()。
```

min, max, step, value, label, unit；setValue(number)。
