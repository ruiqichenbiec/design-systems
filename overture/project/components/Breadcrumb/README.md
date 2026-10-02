# 路径导航 · Breadcrumb

用细线方向标记说明当前层级。

## 何时使用

档案、作品详情和分类页。

## 交互与状态

当前位置 aria-current；示例链接发出选择事件。

## 接入

```js
const instance = Overture.mount('Breadcrumb', host, {});
// 监听 instance.element 的 ov:change。移除时调用 instance.destroy()。
```

items；ov:change 的 value 为所选层级。
