# 共振播放器 · CuePlayer

三音合成声音片段让声响、时间线和播放状态相连。

## 何时使用

声音作品入口；这里只提供原创合成音色示意。

## 交互与状态

播放、暂停、续播、拖动进度、静音、结束。

## 接入

```js
const instance = Overture.mount('CuePlayer', host, {});
// 监听 instance.element 的 ov:change。移除时调用 instance.destroy()。
```

默认 12 秒，不自动播放；组件销毁时关闭 AudioContext。
