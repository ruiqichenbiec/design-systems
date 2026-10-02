# 红线照片墙 · PinnedPhotoWall

固定大光束照在中央，每两格滚轮推动一张照片经过视野；第一格蓄势，第二格运镜落位。

## 何时使用

视觉档案、作品故事、品牌时间线、全屏滚动叙事。

## 交互与状态

两格一张、半步反馈、可打断运镜、首尾释放滚动、索引/键盘/触屏切换、减少动态直接落位。1.3：运镜由 stage 弹簧驱动，连续输入保留速度；移动时镜头略后退，到达时推近；计数翻片；减少动态时淡出淡入到下一张；相纸被拂过时绕图钉摆动。

## 接入

```js
const instance = Overture.mount('PinnedPhotoWall', host, {});
// 监听 instance.element 的 ov:change。移除时调用 instance.destroy()。
```

mode:'contained'|'page', items:[[file,title,category]]；setValue(index) 切换照片；ov:change 返回 index,progress,pending。page 使用一屏高度；触控板小输入累计为两格。
