import "./style.css";
import { initLab } from "./lab";  
import { LES, type NodeDef, type Pt } from "./lessons";

type XY = [number, number];
const $ = <T extends Element = HTMLElement>(id: string) => document.getElementById(id) as unknown as T;
const NS = "http://www.w3.org/2000/svg";
let li = 0, si = 0;
let tm: number | undefined;
let pos: Record<string, NodeDef> = {};
let route: XY[] = [], cum: number[] = [], total = 1, t0 = 0;

function el(n: string, a: Record<string, string | number>, p?: Element): Element {
  const e = document.createElementNS(NS, n);
  for (const k in a) e.setAttribute(k, String(a[k]));
  p?.appendChild(e);
  return e;
}
const ctr = (id: string): XY => { const p = pos[id]; return [p.x + p.w / 2, p.y + p.h / 2]; };
const P = (p: Pt): XY => (typeof p === "string" ? ctr(p) : p);

// point on the border of a box, facing a target point
function clip(id: string, to: XY, gap = 5): XY {
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
  let cy = y + h / 2;
  if (n.k === "file") {
    el("path", { class: "bs", fill, d: `M${x} ${y + d} L${x} ${y + h - d} A${w / 2} ${d} 0 0 0 ${x + w} ${y + h - d} L${x + w} ${y + d} Z` }, g);
    el("ellipse", { class: "bs", fill, cx: x + w / 2, cy: y + d, rx: w / 2, ry: d }, g);
    el("ellipse", { fill: "#fff", "fill-opacity": 0.35, cx: x + w / 2, cy: y + d, rx: w / 2, ry: d }, g);
    cy += 6;
  } else {
    el("rect", { class: "bs", fill, x, y, width: w, height: h, rx: 8 }, g);
  }
  el("text", { x: x + w / 2, y: cy - 5, "text-anchor": "middle", "font-size": 13, "font-weight": 700 }, g).textContent = n.a;
  el("text", { x: x + w / 2, y: cy + 13, "text-anchor": "middle", "font-size": 10.5 }, g).textContent = n.b;
}

function build(): void {
  const L = LES[li], s = $<SVGSVGElement>("sv");
  s.innerHTML =
    '<defs>' +
    '<marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1 1L9 5L1 9z" style="fill:var(--mut)"/></marker>' +
    '<marker id="ahh" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M1 1L9 5L1 9z" style="fill:var(--hot)"/></marker>' +
    '</defs>';
  pos = {}; route = [];
  L.n.forEach(n => (pos[n.id] = n));
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
  el("circle", { id: "pk", r: 8, cx: 0, cy: 0, opacity: 0 }, s);

  $("ti").textContent = L.t; $("su").textContent = L.s;
  const d = $("dt"); d.innerHTML = "";
  L.st.forEach((x, i) => {
    const b = document.createElement("button");
    b.className = "dot"; b.textContent = String(i + 1); b.id = "d" + i;
    b.setAttribute("aria-label", `Step ${i + 1}: ${x.h}`);
    b.onclick = () => { stop(); go(i); };
    d.appendChild(b);
  });
  const ls = $("ls"); ls.innerHTML = "";
  LES.forEach((x, i) => {
    const b = document.createElement("button");
    b.className = "lsn"; b.textContent = x.t;
    b.setAttribute("aria-current", String(i === li));
    b.onclick = () => { stop(); li = i; build(); go(0); };
    ls.appendChild(b);
  });
}

function go(i: number): void {
  const L = LES[li], S = L.st[i];
  si = i;
  document.querySelectorAll(".nd").forEach(g => g.setAttribute("class", "nd"));
  S.a?.forEach(id => $("n_" + id).classList.add("on"));
  S.b?.forEach(id => $("n_" + id).classList.add("bad"));
  $("sn").textContent = `Step ${i + 1} of ${L.st.length}`;
  $("sh").textContent = S.h; $("sp").textContent = S.p; $("sk").textContent = S.k;
  L.st.forEach((_, j) => { $("d" + j).className = "dot" + (j === i ? " cur" : j < i ? " done" : ""); });
  $<HTMLButtonElement>("bk").disabled = i === 0;
  $("nx").textContent = i === L.st.length - 1 ? "Replay lesson" : "Next";
  move(S.m);
}

// the route lights up and a dot travels along it in straight lines
function move(m?: Pt[]): void {
  const hl = $("hl"), pk = $("pk");
  hl.innerHTML = "";
  route = [];
  if (!m) { pk.setAttribute("opacity", "0"); return; }
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
  const d = Math.min(Math.max(now - t0, 0) * 0.22, total);
  let i = 1;
  while (i < cum.length - 1 && cum[i] < d) i++;
  const f = (d - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
  const pk = $("pk");
  pk.setAttribute("cx", String(route[i - 1][0] + (route[i][0] - route[i - 1][0]) * f));
  pk.setAttribute("cy", String(route[i - 1][1] + (route[i][1] - route[i - 1][1]) * f));
}

function stop(): void { clearInterval(tm); tm = undefined; $("pl").textContent = "Play"; }

$("nx").onclick = () => { stop(); go(si >= LES[li].st.length - 1 ? 0 : si + 1); };
$("bk").onclick = () => { stop(); if (si > 0) go(si - 1); };
$("rp").onclick = () => { stop(); go(0); };
$("pl").onclick = () => {
  if (tm) { stop(); return; }
  $("pl").textContent = "Pause";
  if (si >= LES[li].st.length - 1) go(0);
  tm = window.setInterval(() => { if (si >= LES[li].st.length - 1) stop(); else go(si + 1); }, 4200);
};
$("th").onclick = () => {
  const r = document.documentElement, d = r.getAttribute("data-theme");
  const dark = d ? d === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  r.setAttribute("data-theme", dark ? "light" : "dark");
};
document.addEventListener("keydown", e => {
  if (e.key === "ArrowRight") $("nx").click();
  else if (e.key === "ArrowLeft") $("bk").click();
  else if (e.key === "r" || e.key === "R") $("rp").click();
});

build();
go(0);
requestAnimationFrame(frame);
initLab();