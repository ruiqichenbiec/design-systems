# 底片档案 · ContactSheet

底片与齿孔自动循环走片，焦点逐帧移动；照片、相纸边框、题名和套准标记共同换位。

## 何时使用

作品浏览、系列筛选、图像选择。

## 交互与状态

自动循环、暂停/继续、悬停/聚焦停格、离屏暂停、键盘与减少动态。1.3：底片带 1:1 跟手拖动，甩出后按速度停在最近一帧（settle 弹簧承接速度）。

## 接入

```js
const instance = Overture.mount('ContactSheet', host, {});
// 监听 instance.element 的 ov:change。移除时调用 instance.destroy()。
```

items:[[file,title,category]], autoplay:true, interval:4800, index:0；setValue(index)。自动播放不播报 live region，不移动键盘焦点。
