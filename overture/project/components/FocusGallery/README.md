# 取景画廊 · FocusGallery

网格图像经聚焦显影后，进入独立的大图阅读。

## 何时使用

摄影、时装作品或演出档案。

## 交互与状态

悬停、聚焦、放大、前后翻图、Escape 关闭。1.3：打开时照片从缩略图飞到灯箱并显影，关闭时飞回原位；翻页按方向滑入并显影。

## 接入

```js
const instance = Overture.mount('FocusGallery', host, {});
// 监听 instance.element 的 ov:change。移除时调用 instance.destroy()。
```

items；原生 dialog 和焦点返回；左右键翻图。
