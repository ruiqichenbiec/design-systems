# 翻页 · Pagination

像翻阅底片页一样浏览有限集合。

## 何时使用

分页作品、资料清单。

## 交互与状态

首末页禁用、页码播报、按钮焦点。1.3：页码按翻页方向翻片。

## 接入

```js
const instance = Overture.mount('Pagination', host, {});
// 监听 instance.element 的 ov:change。移除时调用 instance.destroy()。
```

total, size；setValue(page)，事件含起止索引。
