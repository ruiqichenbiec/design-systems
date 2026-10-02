# 档案表格 · EditorialTable

编辑档案般的细线表格，支持有意义的排序。

## 何时使用

作品清单、批次与状态。

## 交互与状态

默认、排序升降、行悬停、表头语义。1.3：排序时同一行 FLIP 到新位置，排序箭头翻转。

## 接入

```js
const instance = Overture.mount('EditorialTable', host, {});
// 监听 instance.element 的 ov:change。移除时调用 instance.destroy()。
```

rows:[{title,category,frames,state}]。
