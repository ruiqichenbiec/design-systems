// The contract between a showcase page and the exposure site that frames it (../index.html).
// The site reads progress and readiness to time its loading animation, and parks the page while it is closed.
// Every call is a no-op when the page is opened on its own.

export const params = new URLSearchParams(location.search);
export const lang = params.get('lang') === 'en' ? 'en' : 'zh';
export const fullMotion = params.get('motion') !== 'reduced';
document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
document.documentElement.dataset.lang = lang;

const framed = window.parent !== window;
const post = (message) => { if (framed) try { window.parent.postMessage({ exposure: 1, ...message }, location.origin); } catch {} };
const listeners = { park: new Set(), sound: new Set() };
let parked = false;
window.exposurePage = {
  park(p) { p = Boolean(p); if (p === parked) return; parked = p; listeners.park.forEach((f) => f(p)); },
  sound(on) { listeners.sound.forEach((f) => f(Boolean(on))); },
};
export const on = (type, f) => { listeners[type].add(f); if (type === 'park' && parked) f(true); };

let shown = 0;
export const progress = (value) => { shown = Math.max(shown, Math.min(0.99, value)); post({ type: 'progress', value: shown }); };
// two frames after the call, so whatever the page drew is on screen when the loader steps aside
export function ready() { requestAnimationFrame(() => requestAnimationFrame(() => post({ type: 'ready' }))); }
progress(0.3); // this module runs once the document has been parsed

// Holds a window's frame loop while `held()` is true; callbacks queue and run on release.
export function gateFrames(win) {
  const raf = win.requestAnimationFrame.bind(win), caf = win.cancelAnimationFrame.bind(win);
  const queued = new Map(), flying = new Map();
  let seq = 1e9, holding = false;
  const fly = (id, cb) => flying.set(id, raf((t) => { flying.delete(id); cb(t); }));
  win.requestAnimationFrame = (cb) => { const id = ++seq; holding ? queued.set(id, cb) : fly(id, cb); return id; };
  win.cancelAnimationFrame = (id) => { if (queued.delete(id)) return; if (flying.has(id)) { caf(flying.get(id)); flying.delete(id); } else caf(id); };
  return (h) => { if (h === holding) return; holding = h; if (!h) { queued.forEach((cb, id) => fly(id, cb)); queued.clear(); } };
}

// Shows an existing system page as a still first screen: its own scrolling is pinned at the top, input it
// does not use reaches this page, and its frame loop is held whenever the hero is off screen or the site parks it.
export function pinFirstScreen(iframe, { progressFrom = 0.35, progressTo = 0.9 } = {}) {
  return new Promise((resolve) => {
    let t = progressFrom; const creep = setInterval(() => progress(t += (progressTo - t) * 0.08), 120);
    iframe.addEventListener('load', () => {
      clearInterval(creep); progress(progressTo);
      let win, doc;
      try { win = iframe.contentWindow; doc = win.document; } catch { resolve(); return; }
      const lock = doc.createElement('style');
      lock.textContent = 'html,body{overflow:hidden!important;scroll-behavior:auto!important}';
      doc.head.append(lock);
      win.scrollTo(0, 0);
      win.addEventListener('scroll', () => { if (win.scrollY) win.scrollTo(0, 0); });
      // the nested page swallows these; hand them on so the site can count pulls at the page's top edge
      win.addEventListener('wheel', (e) => window.dispatchEvent(new WheelEvent('wheel', { deltaX: e.deltaX, deltaY: e.deltaY, deltaMode: e.deltaMode })), { passive: true });
      for (const type of ['touchstart', 'touchmove', 'touchend'])
        win.addEventListener(type, (e) => window.dispatchEvent(new CustomEvent('exposure:touch', { detail: { type, y: e.touches[0]?.clientY ?? 0 } })), { passive: true });
      win.addEventListener('keydown', (e) => window.dispatchEvent(new KeyboardEvent('keydown', { key: e.key, code: e.code, shiftKey: e.shiftKey })));

      const hold = gateFrames(win);
      let visible = true;
      const sync = () => {
        hold(parked || !visible);
        doc.querySelectorAll('video').forEach((v) => { if (parked || !visible) { if (!v.paused) { v.dataset.exposureHeld = '1'; v.pause(); } } else if (v.dataset.exposureHeld) { delete v.dataset.exposureHeld; v.play().catch(() => {}); } });
      };
      new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); }).observe(iframe);
      on('park', sync);
      resolve(win);
    }, { once: true });
  });
}
