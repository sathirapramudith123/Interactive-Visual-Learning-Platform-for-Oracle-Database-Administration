import "./style.css";
import { LECS, type Lesson, type NodeDef, type Pt } from "./lessons";
import { SIMS, type Act, type Sim, type S as SimState } from "./sims";
import { initLab } from "./lab";

type XY = [number, number];
interface Row { n: number; t: string; from: string; to: string; tag: string; info: string }
const $ = <T extends Element = HTMLElement>(id: string) => document.getElementById(id) as unknown as T;
const NS = "http://www.w3.org/2000/svg";
const esc = (s: string): string => s.replace(/[&<>]/g, c => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"));

let gi = 0, li = 0, si = 0, speed = 1, playing = true, complete = false;
let mode: "learn" | "practice" = "learn";
let tm: number | undefined;
let rows: Row[] = [];
let pos: Record<string, NodeDef> = {};
let route: XY[] = [], cum: number[] = [], total = 1, t0 = 0;
let sim: Sim | null = null, ss: SimState = {};
const cur = (): Lesson => LECS[gi].subs[li];
const openG = new Set<number>([0]);

// progress and theme are saved in the browser
const KEY = "dba-done";
const done = new Set<string>();
try { (JSON.parse(localStorage.getItem(KEY) || "[]") as string[]).forEach(k => done.add(k)); } catch { /* ignore */ }
const save = (): void => { try { localStorage.setItem(KEY, JSON.stringify([...done])); } catch { /* ignore */ } };

function setTheme(t: string): void {
  document.documentElement.setAttribute("data-theme", t);
  try { localStorage.setItem("dba-theme", t); } catch { /* ignore */ }
  $("th").textContent = t === "dark" ? "Light mode" : "Dark mode";
}
let savedTheme: string | null = null;
try { savedTheme = localStorage.getItem("dba-theme"); } catch { /* ignore */ }
setTheme(savedTheme === "dark" || savedTheme === "light" ? savedTheme : matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

// ---------- diagram (2D) ----------
function el(n: string, a: Record<string, string | number>, p?: Element): Element {
  const e = document.createElementNS(NS, n);
  for (const k in a) e.setAttribute(k, String(a[k]));
  p?.appendChild(e);
  return e;
}
const ctr = (id: string): XY => { const p = pos[id]; return [p.x + p.w / 2, p.y + p.h / 2]; };
const P = (p: Pt): XY => (typeof p === "string" ? ctr(p) : p);

// point on the border of a box, facing a target point
function clip(id: string, to: XY, gap = 6): XY {
  const n = pos[id], c = ctr(id), dx = to[0] - c[0], dy = to[1] - c[1];
  const t = Math.min(dx ? (n.w / 2 + gap) / Math.abs(dx) : Infinity, dy ? (n.h / 2 + gap) / Math.abs(dy) : Infinity);
  return [c[0] + dx * t, c[1] + dy * t];
}
function seg(a: Pt, b: Pt): [XY, XY] {
  const A = P(a), B = P(b);
  return [typeof a === "string" ? clip(a, B) : A, typeof b === "string" ? clip(b, A) : B];
}

function drawNode(g: Element, n: NodeDef): void {
  const fill = `var(--${n.k})`, { x, y, w, h } = n, d = 10;
  const fs = Math.min(16, w / 9.2);
  let cy = y + h / 2;
  if (n.k === "file") {
    el("path", { class: "bs", fill, d: `M${x} ${y + d} L${x} ${y + h - d} A${w / 2} ${d} 0 0 0 ${x + w} ${y + h - d} L${x + w} ${y + d} Z` }, g);
    el("ellipse", { class: "bs", fill, cx: x + w / 2, cy: y + d, rx: w / 2, ry: d }, g);
    el("ellipse", { fill: "#fff", "fill-opacity": 0.3, cx: x + w / 2, cy: y + d, rx: w / 2, ry: d }, g);
    cy += 6;
  } else {
    el("rect", { class: "bs", fill, x, y, width: w, height: h, rx: 10 }, g);
  }
  el("text", { x: x + w / 2, y: cy - 4, "text-anchor": "middle", "font-size": fs, "font-weight": 700 }, g).textContent = n.a;
  el("text", { x: x + w / 2, y: cy + fs + 2, "text-anchor": "middle", "font-size": fs * 0.78 }, g).textContent = n.b;
}

// zoom the picture to fit what is drawn, so it fills the panel
function fit(s: Element): void {
  const L = cur(), xs: number[] = [], ys: number[] = [];
  L.n.forEach(n => { xs.push(n.x, n.x + n.w + 6); ys.push(n.y, n.y + n.h + 6); });
  L.f.forEach(f => { xs.push(f[0], f[0] + f[2]); ys.push(f[1], f[1] + f[3]); });
  L.st.forEach(st => st.m?.forEach(p => { if (typeof p !== "string") { xs.push(p[0]); ys.push(p[1]); } }));
  const pad = 24;
  const x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad;
  let y0 = Math.min(...ys) - pad, y1 = Math.max(...ys) + pad;
  const minH = 250;
  if (y1 - y0 < minH) { const c = (y0 + y1) / 2; y0 = c - minH / 2; y1 = c + minH / 2; }
  s.setAttribute("viewBox", `${x0} ${y0} ${x1 - x0} ${y1 - y0}`);
}

function build(): void {
  const L = cur(), s = $<SVGSVGElement>("sv");
  s.innerHTML =
    '<defs>' +
    '<marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1 1L9 5L1 9z" style="fill:var(--mut)"/></marker>' +
    '<marker id="ahh" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M1 1L9 5L1 9z" style="fill:var(--hot)"/></marker>' +
    '</defs>';
  pos = {}; route = [];
  L.n.forEach(n => (pos[n.id] = n));
  fit(s);
  L.f.forEach(f => {
    el("rect", { x: f[0], y: f[1], width: f[2], height: f[3], rx: 12, class: "fr" }, s);
    el("text", { x: f[0] + 10, y: f[1] + 16, class: "fl" }, s).textContent = f[4];
  });
  L.e.forEach(e => {
    const [a, b] = seg(e[0], e[1]);
    el("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: "eg", "marker-end": "url(#ah)" }, s);
  });
  el("g", { id: "hl" }, s);
  L.n.forEach(n => drawNode(el("g", { class: "nd", id: "n_" + n.id }, s), n));
  el("circle", { id: "pk", r: 9, cx: 0, cy: 0, opacity: 0 }, s);
  $("ti").textContent = L.t;
  $("su").textContent = `${LECS[gi].t} \u00B7 ${L.s}`;
  openG.add(gi);
}

// highlight boxes and run the orange dot along the route
function move(m?: Pt[]): void {
  const hl = $("hl"), pk = $("pk");
  hl.innerHTML = "";
  route = [];
  if (!m || m.length < 2) { pk.setAttribute("opacity", "0"); return; }
  for (let i = 0; i < m.length - 1; i++) {
    const [a, b] = seg(m[i], m[i + 1]);
    el("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: "rt", "marker-end": "url(#ahh)" }, hl);
    route.push(a, b);
  }
  cum = [0];
  for (let i = 1; i < route.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(route[i][0] - route[i - 1][0], route[i][1] - route[i - 1][1]));
  }
  total = cum[cum.length - 1] || 1;
  t0 = performance.now() + 250;
  pk.setAttribute("opacity", "1");
  pk.setAttribute("cx", String(route[0][0]));
  pk.setAttribute("cy", String(route[0][1]));
}
function frame(now: number): void {
  requestAnimationFrame(frame);
  if (route.length < 2) return;
  const d = Math.min(Math.max(now - t0, 0) * 0.22 * speed, total);
  let i = 1;
  while (i < cum.length - 1 && cum[i] < d) i++;
  const f = (d - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
  const pk = $("pk");
  pk.setAttribute("cx", String(route[i - 1][0] + (route[i][0] - route[i - 1][0]) * f));
  pk.setAttribute("cy", String(route[i - 1][1] + (route[i][1] - route[i - 1][1]) * f));
}
function mark(on: string[], bad: string[]): void {
  document.querySelectorAll("#sv .nd").forEach(g => g.setAttribute("class", "nd"));
  on.forEach(id => $("n_" + id)?.classList.add("on"));
  bad.forEach(id => $("n_" + id)?.classList.add("bad"));
}

// ---------- sidebar ----------
const hasNext = (): boolean => li < LECS[gi].subs.length - 1 || gi < LECS.length - 1;
function side(): void {
  const ls = $("ls"); ls.innerHTML = "";
  LECS.forEach((lec, g) => {
    const dn = lec.subs.filter((_, k) => done.has(g + "-" + k)).length;
    const h = document.createElement("button");
    h.className = "gh";
    h.setAttribute("aria-expanded", String(openG.has(g)));
    const a = document.createElement("span"); a.textContent = lec.t;
    const c = document.createElement("span"); c.className = "cnt"; c.textContent = `${dn}/${lec.subs.length}`;
    h.append(a, c);
    h.onclick = () => { if (openG.has(g)) openG.delete(g); else openG.add(g); side(); };
    ls.appendChild(h);
    if (!openG.has(g)) return;
    const box = document.createElement("div"); box.className = "subs";
    lec.subs.forEach((sub, k) => {
      const b = document.createElement("button");
      b.className = "sl" + (done.has(g + "-" + k) ? " done" : "");
      b.textContent = sub.t;
      b.setAttribute("aria-current", String(g === gi && k === li));
      b.onclick = () => { gi = g; li = k; openLesson(); };
      box.appendChild(b);
      if (mode === "learn" && g === gi && k === li) {
        const ol = document.createElement("div"); ol.className = "stl";
        sub.st.forEach((s, i) => {
          const sb = document.createElement("button");
          sb.className = complete || i < si ? "dn" : i === si ? "cu" : "";
          sb.textContent = s.h;
          sb.onclick = () => { complete = false; showStep(i, true); if (playing) schedule(); };
          ol.appendChild(sb);
        });
        box.appendChild(ol);
      }
    });
    ls.appendChild(box);
  });
}

// ---------- Learn mode: automatic playback ----------
function addRows(i: number): void {
  const L = cur(), S = L.st[i];
  const lab = (id: string): string => L.n.find(n => n.id === id)?.a ?? id;
  const ids = (S.m ?? []).filter((p): p is string => typeof p === "string");
  const hops: [string, string][] = [];
  for (let j = 0; j < ids.length - 1; j++) if (ids[j] !== ids[j + 1]) hops.push([ids[j], ids[j + 1]]);
  if (!hops.length) { const a = S.a ?? []; hops.push([a[0] ?? "", a[a.length - 1] ?? ""]); }
  hops.forEach((h, j) => {
    rows.push({
      n: rows.length + 1, t: (i + j * 0.12).toFixed(3) + "s",
      from: h[0] ? lab(h[0]) : "-", to: h[1] && h[1] !== h[0] ? lab(h[1]) : "-",
      tag: `Step ${i + 1}`, info: S.h + ": " + S.k,
    });
  });
}
function renderTable(): void {
  $("tb").innerHTML = rows.map((r, i) =>
    `<tr class="${i === rows.length - 1 ? "last" : ""}"><td>${r.n}</td><td>${r.t}</td><td>${esc(r.from)}</td><td>${esc(r.to)}</td><td>${r.tag}</td><td>${esc(r.info)}</td></tr>`).join("");
  const w = $("twrap"); w.scrollTop = w.scrollHeight;
}
function renderPanel(): void {
  const L = cur(), S = L.st[si], b = $("pbody");
  if (complete) {
    b.innerHTML = `<h2>LESSON SUMMARY</h2><div class="tag">Lesson complete</div><h3>${esc(L.t)}</h3><p>${esc(L.s)}</p>` +
      `<table class="kt">${L.st.map((s, i) => `<tr><th>Step ${i + 1}</th><td>${esc(s.k)}</td></tr>`).join("")}</table>` +
      `<div class="pbtn"><button id="pnext" class="go">${hasNext() ? "Next lesson" : "Replay"}</button> <button id="ptry">Try it in Practice</button></div>`;
    $("pnext").onclick = () => (hasNext() ? nextLesson() : startLearn());
    $("ptry").onclick = () => setMode("practice");
  } else {
    b.innerHTML = `<h2>LESSON SUMMARY</h2><div class="tag">Step ${si + 1} of ${L.st.length}</div><h3>${esc(S.h)}</h3><p>${esc(S.p)}</p>` +
      `<div class="key"><b>Key idea</b><br>${esc(S.k)}</div>`;
  }
}
function showStep(i: number, fresh = false): void {
  if (fresh) { rows = []; for (let j = 0; j <= i; j++) addRows(j); } else addRows(i);
  si = i;
  const S = cur().st[i];
  mark(S.a ?? [], S.b ?? []);
  move(S.m);
  renderPanel(); renderTable(); side();
}
function setPlayBtn(): void { $("play").textContent = playing ? "Pause" : "Play"; }
function stopTimer(): void { clearTimeout(tm); tm = undefined; }
function schedule(): void {
  stopTimer();
  if (!playing || mode !== "learn") return;
  tm = window.setTimeout(() => { if (si < cur().st.length - 1) { showStep(si + 1); schedule(); } else finish(); }, 4200 / speed);
}
function finish(): void {
  stopTimer();
  complete = true; playing = false;
  done.add(gi + "-" + li); save();
  setPlayBtn(); renderPanel(); side();
}
function startLearn(): void { stopTimer(); complete = false; playing = true; setPlayBtn(); showStep(0, true); schedule(); }
function nextLesson(): void {
  if (li < LECS[gi].subs.length - 1) li++;
  else if (gi < LECS.length - 1) { gi++; li = 0; }
  openLesson();
}

// ---------- Practice mode ----------
function addLog(text: string, cls: string): void {
  const d = document.createElement("div");
  d.className = cls; d.textContent = text;
  const log = $("slog");
  log.appendChild(d); log.scrollTop = log.scrollHeight;
}
function simReset(): void {
  sim = SIMS[cur().t] ?? null;
  $("sacts").innerHTML = ""; $("slog").innerHTML = "";
  mark([], []); move(undefined);
  const b = $("pbody");
  if (!sim) {
    $("shud").textContent = "";
    b.innerHTML = `<h2>PRACTICE</h2><div class="tag">Practice</div><h3>${esc(cur().t)}</h3><p>There is no practice for this lesson yet.</p>`;
    return;
  }
  ss = JSON.parse(JSON.stringify(sim.init)) as SimState;
  sim.acts.forEach(a => {
    const bt = document.createElement("button");
    bt.className = "sa"; bt.textContent = a.l;
    bt.onclick = () => simAct(a);
    $("sacts").appendChild(bt);
  });
  $("shud").textContent = sim.hud(ss);
  b.innerHTML = `<h2>PRACTICE</h2><div class="tag">Your goal</div><h3>${esc(cur().t)}</h3><p>${esc(sim.goal)}</p>` +
    `<div class="key"><b>How it works</b><br>Press the buttons under the diagram. A green line in the log means it worked. An orange line means Oracle would refuse, and the message says why.</div>` +
    `<div class="res" id="pres">Nothing done yet.</div>`;
  addLog("Practice ready.", "");
}
function simAct(a: Act): void {
  if (!sim) return;
  const r = a.f(ss);
  const ids = r.lit ?? (r.m ?? []).filter(x => !!pos[x]);
  mark(ids, r.e && ids.length ? [ids[ids.length - 1]] : []);
  move(r.m);
  $("shud").textContent = sim.hud(ss);
  const pr = $("pres");
  pr.className = "res " + (r.e ? "se" : "so");
  pr.textContent = (r.e ? "\u2715 " : "\u2713 ") + a.l + ": " + r.t;
  addLog((r.e ? "\u2715 " : "\u2713 ") + a.l + ": " + r.t, r.e ? "se" : "so");
}

// ---------- modes and lessons ----------
function openLesson(): void {
  build();
  if (mode === "learn") startLearn(); else { stopTimer(); simReset(); side(); }
}
function setMode(m: "learn" | "practice"): void {
  mode = m; stopTimer(); playing = false;
  $("flow").hidden = m !== "learn";
  $("simbox").hidden = m !== "practice";
  $("tlearn").setAttribute("aria-selected", String(m === "learn"));
  $("tprac").setAttribute("aria-selected", String(m === "practice"));
  if (m === "learn") startLearn(); else { complete = false; simReset(); side(); }
}

// ---------- controls ----------
$("play").onclick = () => {
  if (complete) { startLearn(); return; }
  playing = !playing; setPlayBtn();
  if (playing) schedule(); else stopTimer();
};
$("rep").onclick = startLearn;
$("stp").onclick = () => {
  stopTimer(); playing = false; setPlayBtn();
  if (complete) return;
  if (si < cur().st.length - 1) showStep(si + 1); else finish();
};
$("prv").onclick = () => { stopTimer(); playing = false; complete = false; setPlayBtn(); showStep(Math.max(0, si - 1), true); };
$("rst").onclick = () => { stopTimer(); playing = false; complete = false; setPlayBtn(); showStep(0, true); };
$<HTMLSelectElement>("spd").onchange = () => { speed = Number($<HTMLSelectElement>("spd").value); if (playing) schedule(); };
$("tlearn").onclick = () => setMode("learn");
$("tprac").onclick = () => setMode("practice");
$("sreset").onclick = simReset;
$("th").onclick = () => setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
document.addEventListener("keydown", e => {
  const tg = e.target as HTMLElement;
  if (["INPUT", "SELECT", "TEXTAREA"].includes(tg.tagName) || !$("lab").hidden || mode !== "learn") return;
  if (e.key === "ArrowRight") $("stp").click();
  else if (e.key === "ArrowLeft") $("prv").click();
  else if (e.key === " " && tg.tagName !== "BUTTON") { e.preventDefault(); $("play").click(); }
  else if (e.key === "r" || e.key === "R") $("rep").click();
});

openLesson();
requestAnimationFrame(frame);
initLab();