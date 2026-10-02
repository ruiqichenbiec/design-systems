# 文字输入 · TextField

取景角与底线强调输入焦点；错误贴近字段。

## 何时使用

邮箱、姓名和短文本。

## 交互与状态

空、输入、聚焦、禁用、错误、纠正。1.3：出错时朱红线从左侧曝光，提示文字显影。

## 接入

```js
const instance = Overture.mount('TextField', host, {});
// 监听 instance.element 的 ov:change。移除时调用 instance.destroy()。
```

type, label, value, placeholder, help, error, required, disabled。
