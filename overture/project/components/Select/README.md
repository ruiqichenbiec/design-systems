# 下拉选择 · Select

采用原生选择行为，统一底线和方向标记。

## 何时使用

有限选项，移动端调用系统选择器。

## 交互与状态

聚焦、展开、选定。

## 接入

```js
const instance = Overture.mount('Select', host, {});
// 监听 instance.element 的 ov:change。移除时调用 instance.destroy()。
```

items, label；setValue(value)。
