# 单选组 · ChoiceGroup

相纸从轮廓变为实色，清楚表明互斥选择。

## 何时使用

视觉主题、输出类型、有限方案。

## 交互与状态

选中、未选中、键盘方向键。1.3：选中压印从指针进入处张开。

## 接入

```js
const instance = Overture.mount('ChoiceGroup', host, {});
// 监听 instance.element 的 ov:change。移除时调用 instance.destroy()。
```

items, label；事件含 index 与 value。
