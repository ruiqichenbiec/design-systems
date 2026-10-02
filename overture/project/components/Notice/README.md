# 状态提示 · Notice

朱红细线指出需要关注的状态，并给出恢复动作。

## 何时使用

可恢复错误、缺少素材、下一步说明。

## 交互与状态

待处理、执行恢复动作、已解决。1.3：解决后内容显影。

## 接入

```js
const instance = Overture.mount('Notice', host, {});
// 监听 instance.element 的 ov:change。移除时调用 instance.destroy()。
```

title, message, action；使用文字而不只依赖颜色。
