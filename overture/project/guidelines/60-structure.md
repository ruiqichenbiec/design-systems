# 体系结构与参考

本体系将基础令牌、组件、状态、使用情景和组合案例分开维护。参考 [GOV.UK Design System 组件](https://design-system.service.gov.uk/components/) 对用途与使用说明的组织；参考 [Material 的交互状态](https://m3.material.io/foundations/interaction/states/overview) 检查默认、聚焦、选中、禁用等状态覆盖。没有复制它们的颜色、组件外观或版式。

工作区内参考了 Safelight 的小型交互原语、Lattice 的组件与令牌文件布局、Ash & Dice 的本地构建和 GPU 接入。它们都保持不变；Overture 是独立体系。

`project/tokens.json` 是基础变量来源；`src/catalog-data.mjs` 是组件登记与用法来源；`src/` 是实现。构建同步运行时、组件卡、逐组件说明、站点与 ds-viewer 目录。避免维护多套相互漂移的示例代码。
