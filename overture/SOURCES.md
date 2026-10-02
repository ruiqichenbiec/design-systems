# 来源、版本与许可

- three.js 0.186.1：从工作区 `Video Gen/node_modules/three/build/` 保存 `three.webgpu.js`、`three.core.js` 的固定副本；MIT 许可证随包位于 `project/components/lib/THREE-LICENSE.txt`。没有复制其他设计系统的内部实现。官方文档：https://threejs.org/docs/pages/WebGPURenderer.html 。
- Bodoni Moda Regular 与 Manrope Regular / Semibold：Google Fonts 官方字体服务，下载地址记录于 `project/fonts/upstream.css`，OFL 许可同目录保存。下载日期 2026-09-29；运行时不请求字体服务。
- 三张视觉参考：由 AI 图像生成工具生成，保存在 `project/assets/references/`。
- hero-backstage、runway、stage-bow、camera-hands、backstage-mirror、dance-stage：AI 生成的示例照片。没有把它们当作真实拍摄履历。
- overture-art.png、red-silk.png：由 AI 图像生成工具生成，用于原生界面的无文字素材，不是整张网页截图替代代码。
- 字体、库和图像的 SHA-256 与字节数：运行 `npm run verify` 生成 `verification/assets-manifest.json`。
- resonance-silk.png、textile-panorama.png：2026-09-29 由 AI 图像生成工具从第三／第二参考图派生的生产素材。前者为 1536 × 1024 RGBA 透明衣料，后者为 2143 × 734 黑白织物全景。
- 结构参考：[GOV.UK 组件目录](https://design-system.service.gov.uk/components/) 与 [Material 状态概念](https://m3.material.io/foundations/interaction/states/overview)。只参考组件组织和状态覆盖；外观来自本项目三张图。

## 本次图像提示词

### overture-art

参考：`project/assets/references/01-overture.png`

```text
Edit this image into a production website background asset. Remove ALL typography, navigation, UI buttons, UI lines and numbers, including OVERTURE, A PERSONAL PORTRAIT, ENTER and the footer. Keep the complete photographic scene, exact framing and composition, deep black/oxblood/ivory palette, huge radial silk couture aperture, opera auditorium and anonymous small figure. Seamlessly reconstruct fabric and darkness under the removed lettering. The top should preserve the silk but have sufficient darkness for new live HTML lettering. No new objects, no branding, no text of any kind. Same landscape aspect ratio. Opaque image.
```

### red-silk

参考：`project/assets/references/02-contact-sheet.png`

```text
Use the central red fashion photograph in this reference only as visual inspiration. Generate ONE new standalone full-bleed landscape fashion photograph, not a webpage or collage. A close crop of a vividly red pleated couture sleeve and believable hand in motion on an opera stage, dramatic shaft of warm light, deep oxblood shadows, tactile woven silk, cinematic photo grain, graphic negative space. No face, no text, no frame, no logos. Match the sophisticated analogue photographic quality and red hue of the reference. This is a reusable content image for the personal photography/opera/fashion design system.
```


## 1.1 图钉材质

使用内置 ImageGen 生成 `project/assets/photos/brass-pin.png`，真实透明 alpha，原创摄影式黄铜图钉头；不是来自外部图库。原始输出保留在 Codex 生成目录。

最终提示词：

> Use case: product-mockup. Asset type: transparent photographic UI texture for a museum-like photograph wall. Create ONE single aged brass round map tack / drawing pin head, viewed almost directly from above with very slight perspective, isolated on genuine transparent alpha. Macro product photography, believable softly brushed brass, subtly irregular aged patina, fine scratches, shallow convex round cap, one tiny specular reflection at upper left, a short dark rim at lower right. No slot or screw cross: this is a pushpin, not a screw. The round head occupies 80 percent of a tightly framed square canvas, centered. Warm restrained gold and muted brown compatible with ivory photo prints, charcoal darkroom and red connecting thread. Absolutely no paper, cork, desk, wall, fingers, text, border, other objects or added scenery. No cast shadow extending outside the object; transparent background, clean cutout edges. Not an illustration, not a flat vector icon, not glossy plastic.

## 1.3 单文件演示的内嵌副本

`dist/overture-showcase.html` 内嵌的是由本目录素材派生的压缩副本，存放在 `src/embed/`，由 `tools/prepare-embed.py` 生成；`src/embed/manifest.json` 记录每个副本的源文件 SHA-256，源文件变化后单文件构建会拒绝旧副本。

- 照片：`project/assets/photos/` 的 11 张图用 Pillow 12.3 转为 WebP（质量 80–90，最长边不超过 1600 px；图钉缩到 96 px，保留透明通道），共约 1.1 MB。
- 宣传片：`project/assets/video/overture-promo-15s.mp4`（1080p60）用工作区 `Video Gen/vendor/ffmpeg` 的 ffmpeg 重编码为 1280 × 720、30 fps、H.264 High CRF 25、AAC 96 kb/s，约 2.9 MB。这只是一次性的素材准备；构建和运行都不依赖 Video Gen。
- 字体：`project/fonts/` 的 TTF 原样以 base64 写入样式。three.js 0.186.1 的 `three.core.js`、`three.webgpu.js` 与 `src/engine.mjs` 原样经 gzip 压缩后写入页面，运行时解压，字节与仓库文件一致。
