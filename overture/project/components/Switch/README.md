# 状态开关 · Switch

机械拨杆露出朱红状态窗，让开关像相机上的实体动作一样明确。

## 何时使用

立即生效的偏好设置。

## 交互与状态

开、关、禁用；Space/Enter。1.3：拨杆以 snap 弹簧带轻微过冲落位，按住时下压；可选拨杆声。

## 接入

```js
const instance = Overture.mount('Switch', host, {});
// 监听 instance.element 的 ov:change。移除时调用 instance.destroy()。
```

label, value, disabled；setValue(boolean)。
