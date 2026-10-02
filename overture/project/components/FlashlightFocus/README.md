# 追光取景 · FlashlightFocus

整面六张照片墙固定可见；每三格滚轮切换一张，光束只停在六张照片中心。

## 何时使用

摄影作品浏览、品牌视觉探索、局部内容发现。

## 交互与状态

三格一张、0/3 至 2/3 计数、固定灯位、反向重计、首尾释放滚动、触屏/键盘逐张切换、独立开度、GPU / CSS 降级。1.3：前两格转动准星（对焦环）；第三格光束沿 settle 弹簧移到下一张照片中心，途中收窄、到达张开，只在六个固定灯位停留；减少动态时淡出淡入；指针拂过相纸时绕图钉摆动。

## 接入

```js
const instance = Overture.mount('FlashlightFocus', host, {});
// 监听 instance.element 的 ov:change。移除时调用 instance.destroy()。
```

mode:'contained'|'page', value:25, items:[[file,title,category]]；setValue(0..100) 调整开度；ov:change 返回 x,y,value,index,progress,pending。
