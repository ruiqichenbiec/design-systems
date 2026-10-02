# 关键词输入 · TagInput

把文本整理成可以单独移除的校样标签。

## 何时使用

作品关键词、有限标签。

## 交互与状态

输入、去重、添加、移除、数量上限。1.3：新词显影出现，删去的词被裁掉，其余词 FLIP 到新位置。

## 接入

```js
const instance = Overture.mount('TagInput', host, {});
// 监听 instance.element 的 ov:change。移除时调用 instance.destroy()。
```

value, label；Enter/逗号添加，Backspace 移除。
