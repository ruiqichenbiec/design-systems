# 本地图片选择 · Dropzone

文件进入取景框；仅在本机预览和验证。

## 何时使用

导入 PNG、JPEG、WebP 图片。

## 交互与状态

空、拖入、选择、成功、格式错误、超大文件。1.3：选中的图片显影进入。

## 接入

```js
const instance = Overture.mount('Dropzone', host, {});
// 监听 instance.element 的 ov:change。移除时调用 instance.destroy()。
```

10 MB 上限，支持文件选择键盘入口，销毁时释放对象 URL。
