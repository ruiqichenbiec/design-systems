# 侧边编辑 · Drawer

展开侧幕编辑说明，仍保留原作品的上下文。

## 何时使用

短表单、作品信息、局部编辑。

## 交互与状态

打开、编辑、保存、取消、关闭。1.3：侧幕以 settle 弹簧滑入，内容稍后跟上；任何关闭方式都滑出。

## 接入

```js
const instance = Overture.mount('Drawer', host, {});
// 监听 instance.element 的 ov:change。移除时调用 instance.destroy()。
```

label, title；原生模态焦点，移动端适配屏幕宽度。
