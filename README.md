# 一次曝光 · Three Design Systems

**展示网站 / Live site: https://ruiqichenbiec.github.io/design-systems/**

三套原生 Web 设计体系，MIT 开源。展示网站上的每一屏都是体系自己的实时渲染。

Three native web design systems, MIT-licensed. Every frame on the site is the system's own live rendering.

> Provided as-is. Not actively maintained; issues and pull requests may go unanswered.
> 按原样提供，不再维护。

| | 体系 System | 基础元素 Primitives | 入口 Entry |
|---|---|---|---|
| 01 | **透镜 Lens** | 玻璃 · 液体 · 光 / glass · liquid · light | [lens/START-HERE.md](lens/START-HERE.md) |
| 02 | **点阵 Lattice** | 点 · 集 · 映射 / point · set · map | [lattice/README.md](lattice/README.md) |
| 03 | **序曲 Overture** | 光圈 · 显影 · 弹簧 / aperture · develop · spring | [overture/README.md](overture/README.md) |

## 透镜 Lens

玻璃承载信息，液体表达连续变化，光表达状态。实时背景折射、弹簧形变和原创合成音；18 类组件全部由同一块透镜承载。WebGL2，零运行时依赖。

Glass carries information, liquid shows continuous change, light shows state. Live refraction, spring deformation and synthesized sound; all 18 components are carried by one lens. WebGL2, zero runtime dependencies.

- 单文件展示 Single-file showcase: [lens/lens-showcase-standalone.html](lens/lens-showcase-standalone.html)
- 可复用的包 Portable package: [lens/lab/design-system/](lens/lab/design-system/README.md)

## 点阵 Lattice

万物皆点集，交互即映射。文字、吸引子、定理之瀑和证明树都是同一张 GPU 点阵。three.js + WebGL2，14 类组件。

Everything is a point set; every interaction is a map. Lettering, attractors, a theorem waterfall and proof trees are one GPU lattice. three.js + WebGL2, 14 components.

- 单文件展示 Single-file showcase: [lattice/dist/lattice-showcase.html](lattice/dist/lattice-showcase.html)
- 组件目录 Catalog: [lattice/dist/catalog/index.html](lattice/dist/catalog/index.html)

## 序曲 Overture

摄影、歌剧与时装。开幕是光圈，显影是显影，共振是弹簧：三个运动原语驱动全部 46 个组件。暗场、印纸、夜场三套主题，WebGPU / WebGL2。

Photography, opera and fashion. Opening is an aperture, revealing is developing, resonance is a spring: three motion primitives drive all 46 components. Three themes, WebGPU / WebGL2.

- 单文件展示 Single-file showcase: [overture/dist/overture-showcase.html](overture/dist/overture-showcase.html)
- 组件 Components: [overture/dist/components.html](overture/dist/components.html) · 组件目录 Catalog: [overture/dist/catalog/index.html](overture/dist/catalog/index.html)

## 本地运行 Run locally

```bash
git clone https://github.com/ruiqichenbiec/design-systems
cd design-systems
node serve.mjs          # http://127.0.0.1:4300/
```

只需要 Node.js。单文件展示页也可以直接双击打开。各体系的构建与测试命令见各自的 README。`ds-viewer/` 是生成组件目录页的零依赖工具：`node ds-viewer/build.mjs <system>`。

Only Node.js is needed; the single-file showcases also open straight from disk. Build and test commands are in each system's README. `ds-viewer/` is the zero-dependency catalog generator: `node ds-viewer/build.mjs <system>`.

展示页默认播放完整动效，即使系统开启了“减弱动态”；页面右上角可以切换。`?motion=full` 对三套体系的展示页都有效。

The site plays full motion by default even when the OS asks for reduced motion; switch it at the top right. `?motion=full` works on all three showcases.

## 第三方 Third party

- [three.js](https://threejs.org/)（MIT）：点阵打包进构建，序曲随附固定副本；许可证见 [lattice/THREE-LICENSE.txt](lattice/THREE-LICENSE.txt)、[overture/project/components/lib/THREE-LICENSE.txt](overture/project/components/lib/THREE-LICENSE.txt)。
- 字体 Fonts: Bodoni Moda、Manrope（SIL OFL，许可证见 [overture/project/fonts/](overture/project/fonts/)）；其他网页字体运行时从 Google Fonts 加载。
- 序曲的示例照片和视觉参考图由 AI 生成。Overture's sample photos and reference images are AI-generated.

## License

[MIT](LICENSE) © 2026 DayDreamInAReverie
