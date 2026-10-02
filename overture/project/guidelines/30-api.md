# 接入 · 原生 HTML/CSS/JS

复制 dist 中 `overture.css`、`overture.js` 和整个 `assets/` 目录到你的项目。多文件接入时图形模块需要 HTTP 本地服务；不要依赖 file:// 的跨文件模块加载。只需要一个离线文件时，用 `dist/overture-showcase.html` 的做法：素材以对象 URL 提供给 `configure({assets})`，图形引擎经 `configure({loadEngine})` 加载。

```html
<link rel="stylesheet" href="overture.css">
<script src="overture.js"></script>
<div id="host"></div>
<script>
Overture.configure({ assetBase: 'assets/' });
const instance = Overture.mount('Range', '#host', {
  label: '开度', value: 70,
  onChange: ({ value }) => console.log(value)
});
</script>
```

## 公开协议

- `mount(name, host, options)` 返回 `{element, state, getState(), setValue(value), destroy()}`。host 可为元素或 CSS 选择器。挂载只追加当前组件，不替你删除其他内容。
- `onChange(detail)` 接收状态变化；对应 DOM 事件为冒泡的 `ov:change`，detail 另含 component 名称。会初始化数值的组件可能在 mount 内触发一次 onChange。
- `setValue` 只对组件文档中明确声明的可控组件生效。其他组件由原生控件或传入回调控制。
- `destroy()` 可重复调用；释放事件、定时器、观察器、图形资源、对象 URL、声音和录制流。
- `setTheme('stage'|'paper'|'nocturne', element, {origin})` 给一个作用域设定主题；默认作用于根元素。作用于根元素并给出 `origin`（控件或坐标）时，新主题以光圈从那里扩散（View Transitions；不支持或减少动态时直接切换）。`nextTheme(element, {origin})` 按暗场 → 印纸 → 夜场循环。单个组件也可传 `theme`。
- `configure({assetBase, motion, backend, assets, loadEngine})` 的 assetBase 以斜杠结尾；backend 支持 auto、webgl、static；`assets` 把素材名映射到自带 URL（单文件用）；`loadEngine` 替换图形引擎的加载方式。请在挂载前配置。

## 运动与声音

- `Overture.motion.spring({preset, value, onUpdate, onRest})` 返回 `{to(target, {velocity, preset}), set(value), impulse(dv), freeze(on), finish(), stop(), value, target, velocity, moving, frozen}`。`to()` 返回 Promise：这一段静止时为 true，被新目标取代时为 false。value 可以是数字或数组。预设：snap、settle、stage、resonance、swing。
- `Overture.motion.iris(el, {open, origin, shape:'circle'|'shutter'|'unfold', duration})` 返回 Promise；关闭后裁切保留到调用 `release(el)`。`develop(el)`、`flip(scope, selector, mutate)`、`count(el, text, dir)`、`imprint(el)` 用于显影、重排、翻片与压印；`dissolve(el, swap, {duration, color})` 是减少动态时的空间切换：淡出、在最暗时执行 swap、再淡入。`easing('snap'|'settle')`、`time(name)` 给出与弹簧一致的 CSS 缓动和时长。
- `Overture.setSound(true|false)` 开关交互声音；`Overture.sound.play(name, {at, gain, force})` 播放一种声音（`force` 用于用户明确要求的试听）。声音默认关闭。

## 样式使用

组件类名为 `ov-*`，变量为 `--ov-*`，字体家族为 `--font-display`、`--font-sans`。主题通过 data-theme 继承，常规文字保留原生 DOM。两种主题属于同一体系，可以在不同内容区域明确切换。

## 扩展

调用 `Overture.define(name, factory)` 注册组件。factory 收到 options 与 context：`listen` 为自动清理的事件，`timeout` 为可清理计时，`cleanup(fn)` 注册销毁，`emit(detail)` 发布状态，`child` 挂载随父级销毁的组件。工厂返回一个 HTMLElement。

用户提供的文本必须经 `Overture.escape` 或 textContent 写入。异步回调检查 context.alive；不要把组件的临时状态写进工作区全局设置。
