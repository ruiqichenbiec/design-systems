GPU 点场：每个点都被弹簧拴在当前点集里的一个目标上。换集时，点按扫描顺序逐个松开，先进入 ABC 流（一个无散度的欧拉方程解）再被新集拉回，所以过渡是「倒」过去的，而不是跳过去。

## 使用
- `new Field(stage)` → `field.useSets(Lattice.sets)` → `stage.add(field)` → `field.onResize(stage)`。
- `field.keep(build, opts)`：`build(lattice)` 返回 N×4 的 Float32Array（xyz + 类别 w：0 隐藏、0.35 点阵、1 点亮）。窗口尺寸变化时会用同一个 `build` 重建。
- 现成的集：`L.rest()`、`L.lit([{map: sets.matrixText('HI', 2), col, row}])`、`L.shape(sets.lorenz(N, 2))`（以及 `torusKnot`、`crystal`、`klein`、`sphere`）。
- `opts`：`is3d`（随集旋转、可拖拽）、`sweep`（释放扫描方向）、`dur`、`flow`、`lit`（点亮点的尺寸倍数）、`alpha`。
- 事件：`press`、`tap`、`heat`（0–1）、`release`（`detail.melted`）。

## 规则
- 3D 集必须是真实的数学对象，并在说明里写出参数（如 σ = 10, ρ = 28, β = 8/3）。
- 按住熔化后松开，才映射到下一个集；单击只是冲击波。
- `prefers-reduced-motion` 下过渡瞬间完成，指针场停止。
