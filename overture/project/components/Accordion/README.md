# 折叠说明 · Accordion

用展开动作分配说明文字的阅读深度。

## 何时使用

FAQ、规范、设置分组。

## 交互与状态

关闭、展开、原生 details/summary 键盘行为。1.3：展开与收起都有高度过渡，正文淡入淡出（浏览器支持 interpolate-size 时）。

## 接入

```js
const instance = Overture.mount('Accordion', host, {});
// 监听 instance.element 的 ov:change。移除时调用 instance.destroy()。
```

items:[[title,body]]；事件含 index/open。
