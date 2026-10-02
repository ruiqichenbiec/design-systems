# 显影进度 · Progress

Expose、Develop、Fix 三个过程映射可见进度。

## 何时使用

明确总量的任务；也可由外部真实进度驱动。

## 交互与状态

开始、暂停、继续、完成、重置。1.3：每步 4 % 由 settle 弹簧连成连续推进，运行时前沿有冷光。

## 接入

```js
const instance = Overture.mount('Progress', host, {});
// 监听 instance.element 的 ov:change。移除时调用 instance.destroy()。
```

value；setValue(0..100)。默认是有明确标识的进度示例。
