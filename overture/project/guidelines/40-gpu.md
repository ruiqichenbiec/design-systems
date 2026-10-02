# GPU · 渲染与降级

three.js 0.186.1 的 WebGPURenderer 会优先尝试 WebGPU，再使用 WebGL2。库的两个运行时文件随包保存，无 CDN 请求。依据：[three.js 官方说明](https://threejs.org/docs/pages/WebGPURenderer.html)。

## 实际技术范围

| 组件 | 实现 |
| --- | --- |
| ApertureStage | TSL 材质采样生成的无文字舞台照片，开度遮罩、位移和视差；不是完整建模的三维歌剧院 |
| DevelopImage | TSL 黑白／彩色混合：hover 控制光斑半径（弹簧驱动的进出），active 控制从 origin 漫开的显影液，前沿有一道暖色显影线 |
| SilkResonance | 160 × 100 分段曲面；透明织物图像保留细褶与光照；TSL 顶点波动、张力扭转与轻微视差。属于 2.5D 图像曲面，不是可自由环绕的完整三维布料 |
| BrandComposer | Canvas 2D 排版器，组合相同图像资产和实时 GPU 画面；本机 PNG / WebM 导出 |

## 生命周期与性能

像素比默认上限 1.5，舞台持续运动限制为约 40 fps。不可见或页面隐藏时暂停绘制；减少动态时保留静止造型，并在用户操作时重绘。组件销毁时释放 renderer、geometry、material、texture、RAF、观察器与监听器。

大型 GPU 场景尽量每屏一个。不要把每个表单控件都变成 canvas。组件目录包含光圈、显影、织物、追光和照片墙等 GPU 场景及工坊；常规组件全部保留原生 HTML，适于更广的浏览器和辅助技术。

## 调试入口

`?backend=webgl` 强制 WebGL2，`?backend=static` 检查静态替代，`?motion=reduce` 检查减少动态。宿主元素的 data-renderer 报告实际后端。初始化失败保留图像或参考静帧，不把空画布当成成功。

WebGPU 需要浏览器支持与安全上下文；本地使用 127.0.0.1，或直接以 file:// 打开单文件演示页（file:// 同样是安全上下文）。单文件把 three.js 与引擎以 gzip 内嵌，运行时解压成对象 URL 再按依赖顺序导入；浏览器没有 DecompressionStream 时进入静态模式。追光遮罩新增 `iris` 参数与 `setBeam(x, y, v, k)`：光束在灯位之间移动时，位置、开度与收窄一次更新、绘制一次。GPU 性能和品牌质感是两种不同验收：没有报错不代表已经达到图像参考的视觉水平。
