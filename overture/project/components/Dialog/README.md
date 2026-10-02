# 确认对话框 · Dialog

幕布暂时退暗，给需要确认的当前动作完整焦点。

## 何时使用

需要中断和保护焦点的编辑确认。

## 交互与状态

打开、取消、Escape、校验、保存、焦点返回。1.3：从触发按钮以光圈张开；按钮、取消、Escape、遮罩、保存五条路径都先退回按钮再关闭；遮罩淡入淡出。

## 接入

```js
const instance = Overture.mount('Dialog', host, {});
// 监听 instance.element 的 ov:change。移除时调用 instance.destroy()。
```

label, title；原生 dialog；示例保存只作用于页面。
