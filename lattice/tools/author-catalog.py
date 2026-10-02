# One-off authoring helper: writes catalog/components/<Comp>/{preview.html, README.md}.
# catalog/ is the source for the ds-viewer project; tools/build-project.mjs assembles project/ from it.
import os

C = {}

def comp(name, group, height, subtitle, body, readme, script=""):
    C[name] = (group, height, subtitle, body, readme, script)

STAGE_JS = """  var L = window.Lattice;
  function stage(stations){ return new L.Stage(document.getElementById('c'), stations, L.WORLDS.night); }
"""

comp("Cover", "Cover", 540, "点阵 Lattice",
 '''<section id="s" data-stage style="height:540px"></section>
<canvas class="lx-stage" id="c"></canvas>
<div style="position:absolute;left:40px;bottom:34px;z-index:2"><p style="margin:0;font:700 30px/1.2 var(--f-ui);color:var(--text)"><span lang="zh" style="color:var(--hot)">点阵</span> Lattice</p><p style="margin:6px 0 0;font:400 17px/1.4 var(--f-ui);color:var(--text-dim)">Everything is a set of points. Every interaction is a map.</p></div>''',
 None,
 STAGE_JS + """  var st = stage([{id:'hero', el:'#s', pos:[0,0,10], look:[0,0,0]}]);
  var f = new L.Field(st, {}); f.useSets(L.sets); st.add(f); f.onResize(st);
  f.keep(function(Lt){ return Lt.rest(); }, {dur:0.001});
  setTimeout(function(){ f.keep(function(Lt){ var m = L.sets.matrixText('LATTICE', 2); return Lt.lit([{map:m, col:Math.floor((Lt.cols-m.w)/2), row:Math.floor(Lt.rows*0.2)}]); }, {sweep:[1,0,0], span:9, dur:1.5, lit:1.6, flow:2.4, alpha:0.42}); }, 400);
""")

comp("Field", "Signature", 520, "65,536 GPU points that pour from set to set",
 '''<section id="s" data-stage style="height:520px"></section>
<canvas class="lx-stage" id="c"></canvas>
<div style="position:absolute;left:24px;right:24px;bottom:22px;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:16px">
  <p id="cap" class="matrix" style="margin:0;font-size:15px;color:var(--text)"></p>
  <button class="lx-btn lx-btn--primary" id="next">Next set</button>
</div>''',
 """GPU 点场：每个点都被弹簧拴在当前点集里的一个目标上。换集时，点按扫描顺序逐个松开，先进入 ABC 流（一个无散度的欧拉方程解）再被新集拉回，所以过渡是「倒」过去的，而不是跳过去。

## 使用
- `new Field(stage)` → `field.useSets(Lattice.sets)` → `stage.add(field)` → `field.onResize(stage)`。
- `field.keep(build, opts)`：`build(lattice)` 返回 N×4 的 Float32Array（xyz + 类别 w：0 隐藏、0.35 点阵、1 点亮）。窗口尺寸变化时会用同一个 `build` 重建。
- 现成的集：`L.rest()`、`L.lit([{map: sets.matrixText('HI', 2), col, row}])`、`L.shape(sets.lorenz(N, 2))`（以及 `torusKnot`、`crystal`、`klein`、`sphere`）。
- `opts`：`is3d`（随集旋转、可拖拽）、`sweep`（释放扫描方向）、`dur`、`flow`、`lit`（点亮点的尺寸倍数）、`alpha`。
- 事件：`press`、`tap`、`heat`（0–1）、`release`（`detail.melted`）。

## 规则
- 3D 集必须是真实的数学对象，并在说明里写出参数（如 σ = 10, ρ = 28, β = 8/3）。
- 按住熔化后松开，才映射到下一个集；单击只是冲击波。
- `prefers-reduced-motion` 下过渡瞬间完成，指针场停止。""",
 STAGE_JS + """  var st = stage([{id:'hero', el:'#s', pos:[0,0,10], look:[0,0,0]}]);
  var f = new L.Field(st, {}); f.useSets(L.sets); st.add(f); f.onResize(st);
  var N = f.N, R = 1.7, i = -1;
  var SETS = [
    ['POINT · 5x7 MATRIX', function(Lt){ var m = L.sets.matrixText('POINT', 2); return Lt.lit([{map:m, col:Math.floor((Lt.cols-m.w)/2), row:Math.floor(Lt.rows*0.25)}]); }, {sweep:[1,0,0], span:9, dur:1.5, lit:1.6, flow:2.4, alpha:0.42}],
    ['LORENZ · σ = 10, ρ = 28, β = 8/3', function(Lt){ return Lt.shape(L.sets.lorenz(N, R)); }, {is3d:true, sweep:[0,-1,0], span:5, dur:1.7, lit:1, flow:3.2, alpha:0.22}],
    ['TREFOIL · (2, 3) TORUS KNOT', function(Lt){ return Lt.shape(L.sets.torusKnot(N, 2, 3, R)); }, {is3d:true, sweep:[0,-1,0], span:5, dur:1.7, lit:1, flow:3.2, alpha:0.22}],
    ['FCC CRYSTAL', function(Lt){ return Lt.shape(L.sets.crystal(N, R)); }, {is3d:true, sweep:[0,-1,0], span:5, dur:1.7, lit:1, flow:3.2, alpha:0.22}]
  ];
  function next(){ i = (i + 1) % SETS.length; f.keep(SETS[i][1], SETS[i][2]); document.getElementById('cap').textContent = SETS[i][0]; }
  f.keep(function(Lt){ return Lt.rest(); }, {dur:0.001});
  setTimeout(next, 400);
  document.getElementById('next').addEventListener('click', next);
  f.addEventListener('release', function(e){ if (e.detail.melted) next(); });
""")

comp("Cascade", "Signature", 640, "A dependency DAG poured as a waterfall",
 '''<section id="s" data-stage style="height:640px"></section>
<canvas class="lx-stage" id="c"></canvas>
<p id="info" style="position:absolute;left:20px;bottom:16px;right:20px;z-index:3;margin:0;font:400 14px/1.45 var(--f-ui);color:var(--text-dim)">Hover a result: <b class="hot">what it needs</b> lights orange, <b class="hot2">what it enables</b> ice blue.</p>''',
 """定理之瀑：一张依赖图（DAG）按最长路径深度排成瀑布，前提在上、结论在下。每条依赖是一股从前提落进结论的水滴流，背景的雾点持续下落。

## 使用
- 数据：`{ id, en, zh, st, deps, kind, topic }`，`kind` 决定节点形状（foundation 方块、definition 环、theorem 实心圆）。
- `new Cascade({ theorems, depth: depths(), topicOrder })`，放进 `stage`，相机站点 id 用 `fallTop` / `fallBottom`。
- 事件：`hover`（id 或 null）、`pick`（点击的 id）、`frame`（每帧节点的屏幕坐标，用于摆放 DOM 标签）。
- `cascade.focus(id)` 让键盘或列表也能点亮同样的上下游。

## 规则
- 橙色只表示「它需要什么」（上游），冰蓝只表示「它推出什么」（下游），不要互换。
- 文字标签必须是 DOM（`LabelLayer`），并提供一个可键盘访问的完整列表。""",
 STAGE_JS + """  var D = L.depths(); var maxD = 0; D.forEach(function(v){ if (v > maxD) maxD = v; });
  var mid = -maxD * 1.3 / 2;
  var st = stage([{id:'fallTop', el:'#s', pos:[0, mid, 21], look:[0, mid, 0]}]);
  var c = new L.Cascade({ theorems: L.THEOREMS, depth: D, topicOrder: Object.keys(L.TOPICS), dy: 1.3 });
  st.add(c);
  var labels = new L.LabelLayer();
  L.THEOREMS.forEach(function(t){ labels.get(t.id, t.en); });
  // a small card: label only the landmarks, plus whatever the pointer is tracing
  var MARKS = { zfc:1, lub:1, bw:1, cauchy:1, mvt:1, ftc2:1, uniform:1, banach:1, picard:1, peano:1 }, lit = null;
  c.addEventListener('frame', function(e){ if (!e.detail) return; e.detail.forEach(function(p, i){ var id = L.THEOREMS[i].id; var on = lit ? (id === lit.id || lit.up.has(id) || lit.down.has(id)) : MARKS[id]; labels.place(id, p.x + 8, p.y - 8, p.visible && on ? 0.85 : 0); }); });
  var idle = document.getElementById('info').innerHTML;
  c.addEventListener('hover', function(e){ var t = e.detail && L.byId.get(e.detail); lit = t ? { id: t.id, up: c.ancestors(t.id), down: c.descendants(t.id) } : null; var info = document.getElementById('info'); if (!t) { info.innerHTML = idle; return; } info.textContent = ''; var b = document.createElement('b'); b.style.color = 'var(--text)'; b.textContent = t.en; info.append(b, ' · ' + t.st); });
""")

comp("ProofTree", "Signature", 640, "A proof grows from its conclusion to its axioms",
 '''<section id="s" data-stage style="height:640px"></section>
<canvas class="lx-stage" id="c"></canvas>
<div style="position:absolute;left:20px;top:18px;z-index:3;display:flex;flex-wrap:wrap;gap:8px" id="pick"></div>
<p id="status" class="matrix" style="position:absolute;left:20px;bottom:16px;z-index:3;margin:0;font-size:15px;color:var(--text)"></p>''',
 """证明树：把依赖图从一个结论展开成证明树。结论是树根（在下），前提逐层向上长成枝，叶子是公理；同一引理只长一次，之后出现处标 ↺。枝的粗细与其下叶子数的平方根成正比。

## 使用
- `new ProofTree({ byId })` 放进 `stage`（站点 id `tree`），`tree.grow(id)` 开始生长，旧树会像落叶一样凋落。
- 事件：`grow`、`hover`（节点或 null）、`pick`（点击节点的定理 id，可用来以它为根重新生长）、`frame`（节点屏幕坐标与开花时刻）。
- 在数据中用 `leaf: true` 标出证明止步的地方（例如 ℝ 的完备性）。

## 规则
- 生长按深度推进，枝头为橙色；每次开花可拨一个五声音阶的音；全部长成后冰蓝色的汁液从叶流回根，表示证明闭合。
- `tree.progress()` 返回生长进度（0–1），适合接一个 `mountProgress` 进度条放在旁边。
- `tree.swap(id)` 是旋转转场：展台转半圈，旧树落叶，新树生长；用于随滚动逐个展示证明树。
- 标签默认只显示结论、直接前提和公理叶，其余在悬停路径上出现，避免遮挡。""",
 STAGE_JS + """  var st = stage([{id:'tree', el:'#s', pos:[0, 3.3, 13.5], look:[0, 2.8, 0]}]);
  var tree = new L.ProofTree({ byId: L.byId });
  st.add(tree);
  var labels = new L.LabelLayer();
  var box = document.getElementById('pick');
  ['picard','taylor','heineborel','peano'].forEach(function(id){ var b = document.createElement('button'); b.className = 'lx-btn lx-btn--ghost'; b.style.minHeight = '34px'; b.style.fontSize = '13px'; b.textContent = L.byId.get(id).en; b.onclick = function(){ grow(id); }; box.appendChild(b); });
  function grow(id){ var tr = tree.grow(id); labels.clear(); tr.nodes.forEach(function(n){ labels.get(n.i, (n.ref ? '↺ ' : '') + n.t.en, n.depth === 0 ? 'is-root' : n.ref ? 'is-ref' : ''); }); }
  tree.addEventListener('frame', function(e){ if (!e.detail) return; var tr = e.detail.tree, done = 0; e.detail.proj.forEach(function(p, i){ var n = tr.nodes[i], age = tr.clock - n.bloom; if (age > 0) done++; var show = n.depth <= 1 || (n.leaf && !n.ref); labels.place(i, p.x + 6, p.y - 7, p.visible && age > 0 && show ? Math.min(1, age / 0.5) * 0.9 : 0); }); document.getElementById('status').textContent = done < tr.nodes.length ? 'GROWING · ' + done + ' / ' + tr.nodes.length : '∎ ' + L.byId.get(tr.root.tid).en.toUpperCase(); });
  tree.addEventListener('pick', function(e){ grow(e.detail); });
  grow('picard');
""")

comp("CursorHalo", "Interaction", 230, "The cursor's points re-form around whatever you can press",
 '''<div class="lx-pv"><p class="pv-note">Move the pointer over the controls, or Tab through them: the same outline marks keyboard focus.</p>
<div class="pv-row"><button class="lx-btn lx-btn--primary">Grow a proof</button><button class="lx-btn lx-btn--ghost">Read the notes</button><button class="lx-btn lx-btn--accent">Write to me</button></div></div>''',
 """光标由一个点和它周围的 30 个点组成。经过任何可操作的元素（以及键盘聚焦时），这组点会离开指针，沿控件的圆角轮廓重组并缓慢绕行；按下时向外迸散；在点场上按住时，环会逐渐变成橙色。

## 使用
- `mountCursor()` 一次即可；返回 `{ setHeat(v) }`，点场的 `heat` 事件接到这里。
- 只在精细指针（鼠标、触控板）上启用；触屏回退为页面自带的热度环。
- 加 `data-no-halo` 可以让某个区域不被吸附；加 `data-halo` 让非交互元素也能吸附。

## 规则
- 光环同时是焦点指示：有光标时隐藏浏览器默认焦点框，没有光标时恢复。
- 不要在光标上加文字标签；它只描轮廓。""",
 "  window.Lattice.mountCursor();\n")

comp("Button", "Controls", 150, "Pills: primary, accent, ghost, disabled",
 '''<div class="lx-pv"><div class="pv-row"><button class="lx-btn lx-btn--primary">Grow a proof</button><button class="lx-btn lx-btn--accent">Next set</button><button class="lx-btn lx-btn--ghost">Read the notes</button><button class="lx-btn" disabled>Not yet proved</button></div></div>''',
 """按钮是 44px 高的胶囊。主按钮用骨白底、墨色字；强调按钮用信号橙，每个视图最多一个；幽灵按钮是透明底加描边；禁用按钮只剩淡色字和细线。

## 规则
- 按下时缩放到 0.96；点阵光标负责悬停与按压的点状反馈，按钮本身不加额外动效。
- 图标用点阵绘制的 SVG（`.lx-icon`），不要用字符 → 或 @ 代替图标。""", "")

comp("Tabs", "Controls", 190, "The indicator is a swarm that pours to the chosen tab",
 '''<div class="lx-pv"><div class="lx-tabs" role="tablist" aria-label="Field" id="t"><button role="tab" aria-selected="true" data-value="math"><b>数</b>Mathematics</button><button role="tab" aria-selected="false" data-value="quant"><b>量</b>Quant</button><button role="tab" aria-selected="false" data-value="agents"><b>智</b>Agents</button><button role="tab" aria-selected="false" data-value="games"><b>戏</b>Games</button></div><p class="pv-note" id="o">Selected: math</p></div>''',
 """标签页的指示器是一个 14×2 的点群。切换时点群按顺序松开，带着一小段湍流流向新的标签。

## 使用
- 标准 `role="tablist"` / `role="tab"` 结构；`mountTabs(listEl)`，方向键切换。
- 事件：`tabs:change`（`detail.index`、`detail.value`）。""",
 "  var t = document.getElementById('t'); window.Lattice.mountTabs(t); t.addEventListener('tabs:change', function(e){ document.getElementById('o').textContent = 'Selected: ' + e.detail.value; });\n")

comp("Switch", "Controls", 250, "Off: free-floating gas. On: the points converge and lock",
 '''<div class="lx-pv"><div class="pv-col"><button class="lx-switch lx-switch--lg" id="demo" aria-checked="false"><span class="lx-switch__track"></span><span>Phase<small>flips itself until you press it</small></span></button><button class="lx-switch" aria-checked="false"><span class="lx-switch__track"></span><span>Sound<small>synthesized, quiet</small></span></button><button class="lx-switch" aria-checked="true"><span class="lx-switch__track"></span><span>Auto-advance<small>after 11 s without input</small></span></button></div></div>''',
 """开关：关闭时，点作为气体在整条轨道里自由游离；打开时，点汇聚到右端并锁定成橙色的六边形晶体（每个点落位时闪一下）。同一组点，不同的相。

## 使用
- `<button class="lx-switch" aria-checked="false"><span class="lx-switch__track"></span>…</button>`，`mountSwitch(btn)`。
- 事件：`switch:change`（`detail` 为布尔值）。""",
 "  document.querySelectorAll('.lx-switch').forEach(window.Lattice.mountSwitch); var d = document.getElementById('demo'); setInterval(function(){ if (!d._touched) d._switch.set(!d._switch.on, { quiet: true }); }, 2600);\n")

comp("Slider", "Controls", 130, "A row of dots; the thumb pushes its neighbours",
 '''<div class="lx-pv"><div class="lx-range"><span>Flow</span><div class="lx-slider"><input type="range" min="0" max="100" value="42" aria-label="Flow"></div><output id="o">42</output></div></div>''',
 """滑块：一排点。已选部分为橙色，其余为淡色；七个点组成的拇指绕行，并把相邻的点推开。

## 使用
- 原生 `<input type="range">` 放在 `.lx-slider` 里（透明，负责交互与无障碍），`mountSlider(input)` 负责绘制。""",
 "  var i = document.querySelector('.lx-slider input'); window.Lattice.mountSlider(i); i.addEventListener('input', function(){ document.getElementById('o').textContent = i.value; });\n")

comp("Progress", "Feedback", 190, "New progress is built from the gas: points converge and lock",
 '''<div class="lx-pv"><div class="lx-progress" id="p" data-value="0.62" aria-label="Demo progress"></div><div class="lx-progress" data-indeterminate aria-label="Working" style="margin-top:8px"></div><div class="pv-row" style="margin-top:12px"><button class="lx-btn lx-btn--ghost" id="a">Empty</button><button class="lx-btn lx-btn--ghost" id="b">Fill</button></div></div>''',
 """进度条：三行点。未完成的部分是在整条进度条里自由游离的气态点；每完成一段，就从气体里抽出点，汇聚到该段的格点上，落位时闪一下并固定为橙色。不定进度是一道有序的带子扫过；全部完成时奏一个和弦。

## 使用
- `mountProgress(el)` 返回 `{ set(v), indeterminate(on) }`；元素带 `role="progressbar"` 与 `aria-valuenow`。""",
 "  var L = window.Lattice; var p = L.mountProgress(document.getElementById('p')); document.querySelectorAll('[data-indeterminate]').forEach(L.mountProgress); var manual = false; document.getElementById('a').onclick = function(){ manual = true; p.set(0); }; document.getElementById('b').onclick = function(){ manual = true; p.set(1); }; (function tick(){ if (!manual) { var v = p.value >= 1 ? 0 : Math.min(1, p.value + 0.07 + Math.random() * 0.09); p.set(v); } setTimeout(tick, p.value >= 1 ? 2600 : p.value === 0 ? 1400 : 1050); })();\n")

comp("DotText", "Type", 190, "5×7 matrix lettering that reflows dot by dot",
 '''<div class="lx-pv"><span id="d" style="display:inline-block">043</span><div class="pv-row" style="margin-top:14px"><button class="lx-btn lx-btn--ghost" id="u">+ 1</button><button class="lx-btn lx-btn--ghost" id="q">Say QED</button></div></div>''',
 """点阵字：5×7 位图字形画成点。换字符串时，新字仍需要的点滑到新位置，多余的飞走，缺的补进来。适合计数器、编号和短标签。

## 使用
- `mountDotText(el, { pitch })` 返回 `{ set(text) }`；原文本写入 `aria-label`。
- 字符集：A–Z、0–9、空格、`.`、`-`、`·`。

## 规则
- 只用于短字符串；段落用阅读字体。""",
 "  var L = window.Lattice; var n = 43; var d = L.mountDotText(document.getElementById('d'), { pitch: 7 }); document.getElementById('u').onclick = function(){ n = (n + 1) % 1000; d.set(String(n).padStart(3, '0')); }; document.getElementById('q').onclick = function(){ d.set('QED'); };\n")

comp("Loader", "Feedback", 170, "One Lorenz trajectory as a fading trail",
 '''<div class="lx-pv"><div class="lx-loader" id="l" aria-label="Loading"></div></div>''',
 """加载器：一条洛伦兹轨迹，画成渐隐的点迹，并缓慢旋转。它是系统里「正在思考」的状态。

## 使用
- `mountLoader(el)`；元素自动获得 `role="status"`。""",
 "  window.Lattice.mountLoader(document.getElementById('l'));\n")

comp("TextField", "Controls", 180, "A dotted rule that flows while you type",
 '''<div class="lx-pv"><form class="lx-field" id="f" novalidate><label for="e">Email</label><input id="e" type="email" placeholder="you@example.com" required><p class="lx-field__msg" id="m">Press Enter to check the format.</p></form></div>''',
 """文本框：没有边框，只有一条每 9px 一个点的虚线。聚焦时点变成橙色并沿线流动；出错时点距收紧到 5px，下方文字说明缺了什么。

## 规则
- 错误信息写清楚问题和补救方式，例如「需要用户名、@ 和域名」。""",
 "  var f = document.getElementById('f'), e = document.getElementById('e'); f.addEventListener('submit', function(ev){ ev.preventDefault(); var ok = e.checkValidity(); f.toggleAttribute('data-invalid', !ok); document.getElementById('m').textContent = ok ? 'Looks right.' : 'That is not an email address yet: it needs a name, an @ and a domain.'; });\n")

comp("CommandPalette", "Overlays", 150, "⌘K: every action on the page, marked by a small swarm",
 '''<div class="lx-pv"><p class="pv-note">Opens as a modal dialog. Try ⌘K / Ctrl+K inside this card, or the button.</p><div class="pv-row"><button class="lx-btn lx-btn--primary" id="o">Open commands</button></div><p class="pv-note" id="r"></p></div>''',
 """命令面板：⌘K / Ctrl+K 打开的模态对话框。当前行由一小群点标出，上下移动时点群流到新行；输入按子序列过滤。

## 使用
- `mountCommands([{ id, key, en, zh?, hint?, run }])` 返回 `{ open, close }`。
- `key` 用一个汉字或字母作为行首标记，不要用符号字符代替图标。""",
 "  var c = window.Lattice.mountCommands([{id:'a', key:'下', en:'Next set', run:function(){ document.getElementById('r').textContent = 'Ran: Next set'; }}, {id:'b', key:'树', en:'Grow the proof of Picard–Lindelöf', run:function(){ document.getElementById('r').textContent = 'Ran: Grow a proof'; }}, {id:'c', key:'声', en:'Toggle sound', run:function(){ document.getElementById('r').textContent = 'Ran: Toggle sound'; }}]); document.getElementById('o').onclick = c.open;\n")

comp("Toast", "Overlays", 190, "Messages with a dot-matrix tag",
 '''<div class="lx-pv"><div class="pv-row"><button class="lx-btn lx-btn--ghost" id="t">Send a message</button></div></div>''',
 """消息：右下角出现，带一个会逐点重排的点阵标签，几秒后模糊淡出。容器是 `role="status"` 的礼貌播报区域。

## 使用
- `toast(message, { tag = 'OK', ms = 2800 })`。""",
 "  var L = window.Lattice; L.toast('Proof checked: no gaps found.', { tag: 'OK', ms: 600000 }); document.getElementById('t').onclick = function(){ L.toast('A lemma was saved to the ledger.', { tag: 'SAVED' }); };\n")

root = os.path.join(os.path.dirname(__file__), "..", "catalog", "components")
for name, (group, height, subtitle, body, readme, script) in C.items():
    d = os.path.join(root, name)
    os.makedirs(d, exist_ok=True)
    html = f'<!-- @dsCard group="{group}" height={height} subtitle="{subtitle}" -->\n{body}\n<script>\n(function(){{\n{script}}})();\n</script>\n'
    open(os.path.join(d, "preview.html"), "w", encoding="utf-8").write(html)
    if readme:
        open(os.path.join(d, "README.md"), "w", encoding="utf-8").write(readme.strip() + "\n")
print(len(C), "components authored")
