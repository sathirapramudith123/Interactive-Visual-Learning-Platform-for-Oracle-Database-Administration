import * as THREE from "three";
import "./style.css";
import { LECS, type Lesson, type NodeDef, type Pt } from "./lessons";

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;
const esc = (s: string): string => s.replace(/[&<>]/g, c => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"));
const PAL: Record<string, number> = { user: 0xf5a45d, mem: 0x5aa9ff, file: 0xa78bfa, proc: 0x3ddc97 };
const NAVY = new THREE.Color(0x14213d);
const BAD = new THREE.Color(0xe5484d);

interface Item {
  grp: THREE.Group; mat: THREE.MeshStandardMaterial; on: THREE.Color; off: THREE.Color; glow: THREE.Color;
  label: HTMLDivElement; k: number; isOn: boolean; bad: boolean; top: number;
}
interface Row { n: number; t: string; from: string; to: string; tag: string; info: string }

let gi = 0, li = 0, si = 0, speed = 1, playing = true, complete = false;
let tm: number | undefined;
let rows: Row[] = [];
let items: Record<string, Item> = {};
let pos: Record<string, NodeDef> = {};
let tags: { el: HTMLElement; p: THREE.Vector3 }[] = [];
let path: THREE.Vector3[] = [];
let hl = new THREE.Group();
let cx = 0, cy = 0, bw = 680, bh = 250, cw = 800, ch = 400, t0 = 0;
const cur = (): Lesson => LECS[gi].subs[li];
const openG = new Set<number>([0]);

// progress is saved in the browser
const KEY = "dba-done";
const done = new Set<string>();
try { (JSON.parse(localStorage.getItem(KEY) || "[]") as string[]).forEach(k => done.add(k)); } catch { /* ignore */ }
const save = (): void => { try { localStorage.setItem(KEY, JSON.stringify([...done])); } catch { /* ignore */ } };

// ---------- 3D scene ----------
const host = $("scene");
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
host.appendChild(renderer.domElement);
const lbls = document.createElement("div");
lbls.className = "lbls";
host.appendChild(lbls);

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-400, 400, 200, -200, 1, 4000);
const EL = THREE.MathUtils.degToRad(35), D = 1000;
camera.position.set(D * Math.cos(EL) * Math.SQRT1_2, D * Math.sin(EL), D * Math.cos(EL) * Math.SQRT1_2); // fixed isometric view
camera.lookAt(0, 10, 0);
camera.updateMatrixWorld();
scene.add(new THREE.AmbientLight(0xffffff, 0.9));
const sun = new THREE.DirectionalLight(0xffffff, 1.1);
sun.position.set(-300, 500, 200);
scene.add(sun);
const world = new THREE.Group();
scene.add(world);
const ball = new THREE.Mesh(new THREE.SphereGeometry(9, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffb454 }));
ball.visible = false;
scene.add(ball);

const wx = (x: number): number => x - cx;
const wz = (y: number): number => y - cy;
const ctr = (id: string): [number, number] => { const p = pos[id]; return [p.x + p.w / 2, p.y + p.h / 2]; };

function fitCam(): void {
  const tot = bw + bh;
  let hx = 0.354 * tot + 80, hy = 0.203 * tot + 100;
  const asp = cw / ch;
  if (hx / hy < asp) hx = hy * asp; else hy = hx / asp;
  camera.left = -hx; camera.right = hx; camera.top = hy; camera.bottom = -hy;
  camera.updateProjectionMatrix();
}
function resize(): void {
  cw = host.clientWidth || 800; ch = host.clientHeight || 400;
  renderer.setSize(cw, ch, false);
  fitCam();
}
new ResizeObserver(resize).observe(host);

function place(el: HTMLElement, p: THREE.Vector3): void {
  const v = p.clone().project(camera);
  el.style.left = (v.x * 0.5 + 0.5) * cw + "px";
  el.style.top = (-v.y * 0.5 + 0.5) * ch + "px";
}

// a flat bar on the floor between two points
function ribbon(a: THREE.Vector3, b: THREE.Vector3, color: number, width: number, y: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(a.distanceTo(b), 1.5, width), new THREE.MeshBasicMaterial({ color }));
  m.position.set((a.x + b.x) / 2, y, (a.z + b.z) / 2);
  m.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
  return m;
}

function addNode(n: NodeDef): void {
  const pal = new THREE.Color(PAL[n.k]);
  const off = pal.clone().lerp(NAVY, 0.72), on = pal.clone().lerp(NAVY, 0.12);
  const mat = new THREE.MeshStandardMaterial({ color: off.clone(), roughness: 0.55, metalness: 0.15 });
  const file = n.k === "file";
  const geo = file ? new THREE.CylinderGeometry(0.5, 0.5, 1, 48) : new THREE.BoxGeometry(1, 1, 1);
  const hgt = file ? 46 : 38;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.scale.set(n.w * 0.9, hgt, n.h * 0.9);
  mesh.position.y = hgt / 2;
  mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), new THREE.LineBasicMaterial({ color: 0x5ec8ff })));
  const grp = new THREE.Group();
  grp.add(mesh);
  const [px, py] = ctr(n.id);
  grp.position.set(wx(px), 0, wz(py));
  world.add(grp);
  const label = document.createElement("div");
  label.className = "lb";
  const b = document.createElement("b"); b.textContent = n.a;
  const s = document.createElement("span"); s.textContent = n.b;
  label.append(b, s);
  lbls.appendChild(label);
  items[n.id] = { grp, mat, on, off, glow: pal, label, k: 0, isOn: false, bad: false, top: hgt + 4 };
}

function buildScene(): void {
  const L = cur();
  world.traverse(o => { const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose(); });
  world.clear();
  lbls.innerHTML = "";
  items = {}; tags = []; path = []; ball.visible = false;
  hl = new THREE.Group();
  world.add(hl);
  pos = {};
  L.n.forEach(n => (pos[n.id] = n));

  const xs: number[] = [], ys: number[] = [];
  L.n.forEach(n => { xs.push(n.x, n.x + n.w); ys.push(n.y, n.y + n.h); });
  L.f.forEach(f => { xs.push(f[0], f[0] + f[2]); ys.push(f[1], f[1] + f[3]); });
  L.st.forEach(s => s.m?.forEach(p => { if (typeof p !== "string") { xs.push(p[0]); ys.push(p[1]); } }));
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  cx = (x0 + x1) / 2; cy = (y0 + y1) / 2; bw = x1 - x0; bh = y1 - y0;
  fitCam();

  // floor slab
  const sg = new THREE.BoxGeometry(bw + 70, 8, bh + 70);
  const slab = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ color: 0x0c1a3a, roughness: 1 }));
  slab.position.y = -4;
  slab.add(new THREE.LineSegments(new THREE.EdgesGeometry(sg), new THREE.LineBasicMaterial({ color: 0x264a7a })));
  world.add(slab);

  // dashed frames (for example INSTANCE and DATABASE)
  L.f.forEach(f => {
    const [x, y, w, h, t] = f;
    const pts = [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]].map(q => new THREE.Vector3(wx(q[0]), 0.6, wz(q[1])));
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: 0x4f7fb8, dashSize: 8, gapSize: 6 }));
    line.computeLineDistances();
    world.add(line);
    const d = document.createElement("div");
    d.className = "lb fr"; d.textContent = t;
    lbls.appendChild(d);
    tags.push({ el: d, p: new THREE.Vector3(wx(x + w / 2), 0.6, wz(y - 6)) });
  });

  // links between boxes
  L.e.forEach(e => {
    const a = ctr(e[0]), b = ctr(e[1]);
    world.add(ribbon(new THREE.Vector3(wx(a[0]), 1, wz(a[1])), new THREE.Vector3(wx(b[0]), 1, wz(b[1])), 0x2c4f86, 2.5, 1));
  });
  L.n.forEach(addNode);
  $("ti").textContent = L.t.toUpperCase();
  $("su").textContent = `${LECS[gi].t} \u00B7 ${L.s}`;
}

// the route lights up and the ball rolls along it on the floor
function move(m?: Pt[]): void {
  hl.children.forEach(c => (c as THREE.Mesh).geometry.dispose());
  hl.clear();
  if (!m || m.length < 2) { path = []; ball.visible = false; return; }
  path = m.map(p => {
    const c = typeof p === "string" ? ctr(p) : p;
    return new THREE.Vector3(wx(c[0]), 11, wz(c[1]));
  });
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i].clone(), b = path[i + 1].clone();
    a.y = 2.5; b.y = 2.5;
    hl.add(ribbon(a, b, 0xffb454, 6, 2.5));
  }
  t0 = performance.now() + 200;
  ball.visible = true;
  ball.position.copy(path[0]);
}

function frame(now: number): void {
  requestAnimationFrame(frame);
  for (const id in items) {
    const it = items[id];
    it.k += ((it.isOn ? 1 : 0) - it.k) * 0.15;
    it.grp.position.y = it.k * 8;
    it.mat.color.copy(it.off).lerp(it.on, it.k);
    if (it.bad) it.mat.color.copy(BAD);
    it.mat.emissive.copy(it.bad ? BAD : it.glow).multiplyScalar(it.bad ? 0.45 : 0.45 * it.k);
    it.label.style.opacity = String(0.65 + 0.35 * it.k);
    place(it.label, new THREE.Vector3(it.grp.position.x, it.grp.position.y + it.top, it.grp.position.z));
  }
  tags.forEach(t => place(t.el, t.p));
  if (path.length > 1) {
    const e = (now - t0) / (850 / speed), i = Math.floor(e);
    if (e < 0) ball.position.copy(path[0]);
    else if (i >= path.length - 1) ball.position.copy(path[path.length - 1]);
    else {
      const f = e - i, s = f * f * (3 - 2 * f);
      ball.position.lerpVectors(path[i], path[i + 1], s);
    }
  }
  renderer.render(scene, camera);
}

// ---------- event flow table ----------
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
      tag: `STEP ${i + 1}`, info: S.h + ": " + S.k,
    });
  });
}
function renderTable(): void {
  $("tb").innerHTML = rows.map((r, i) =>
    `<tr class="${i === rows.length - 1 ? "last" : ""}"><td>${r.n}</td><td>${r.t}</td><td>${esc(r.from)}</td><td>${esc(r.to)}</td><td>${r.tag}</td><td>${esc(r.info)}</td></tr>`).join("");
  const w = $("twrap"); w.scrollTop = w.scrollHeight;
}

// ---------- panels ----------
const hasNext = (): boolean => li < LECS[gi].subs.length - 1 || gi < LECS.length - 1;

function renderPanel(): void {
  const L = cur(), S = L.st[si], b = $("pbody");
  if (complete) {
    b.innerHTML = `<div class="tag">LESSON COMPLETE</div><h3>${esc(L.t.toUpperCase())}</h3><p class="sub2">${esc(L.s)}</p>` +
      `<table class="kt">${L.st.map((s, i) => `<tr><th>STEP ${i + 1}</th><td>${esc(s.k)}</td></tr>`).join("")}</table>` +
      `<div class="pbtn"><button id="pnext" class="pri">${hasNext() ? "NEXT LESSON" : "REPLAY"}</button></div>`;
    $("pnext").onclick = () => (hasNext() ? nextLesson() : replay());
  } else {
    b.innerHTML = `<div class="tag">STEP ${si + 1} / ${L.st.length}</div><h3>${esc(S.h.toUpperCase())}</h3><p>${esc(S.p)}</p>` +
      `<div class="key"><b>KEY IDEA</b><br>${esc(S.k)}</div>`;
  }
}

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
      b.onclick = () => { gi = g; li = k; load(); };
      box.appendChild(b);
      if (g === gi && k === li) {
        const ol = document.createElement("div"); ol.className = "stl";
        sub.st.forEach((s, i) => {
          const sb = document.createElement("button");
          sb.className = complete || i < si ? "dn" : i === si ? "cu" : "";
          sb.textContent = s.h.toUpperCase();
          sb.onclick = () => { complete = false; show(i, true); if (playing) schedule(); };
          ol.appendChild(sb);
        });
        box.appendChild(ol);
      }
    });
    ls.appendChild(box);
  });
  const ch2 = $("chips"); ch2.innerHTML = "";
  LECS.forEach((_, g) => {
    const b = document.createElement("button");
    b.textContent = g === LECS.length - 1 ? "G" : String(g + 1);
    b.className = g === gi ? "on" : "";
    b.setAttribute("aria-label", LECS[g].t);
    b.onclick = () => { gi = g; li = 0; load(); };
    ch2.appendChild(b);
  });
}

// ---------- playback ----------
function setPlayBtn(): void { $("play").textContent = playing ? "PAUSE" : "PLAY"; }
function stopTimer(): void { clearTimeout(tm); tm = undefined; }

function apply(i: number): void {
  const S = cur().st[i];
  for (const id in items) {
    items[id].isOn = !!S.a?.includes(id);
    items[id].bad = !!S.b?.includes(id);
  }
  renderPanel();
  move(S.m);
}
function show(i: number, fresh = false): void {
  if (fresh) { rows = []; for (let j = 0; j <= i; j++) addRows(j); } else addRows(i);
  si = i;
  apply(i);
  renderTable();
  side();
}
function finish(): void {
  stopTimer();
  complete = true; playing = false;
  done.add(gi + "-" + li); save();
  setPlayBtn(); renderPanel(); side();
}
function schedule(): void {
  stopTimer();
  if (!playing) return;
  tm = window.setTimeout(() => {
    if (si < cur().st.length - 1) { show(si + 1); schedule(); } else finish();
  }, 4200 / speed);
}
function load(): void {
  stopTimer();
  buildScene();
  openG.add(gi);
  complete = false; playing = true;
  setPlayBtn();
  show(0, true);
  schedule();
}
function replay(): void { stopTimer(); complete = false; playing = true; setPlayBtn(); show(0, true); schedule(); }
function nextLesson(): void {
  if (li < LECS[gi].subs.length - 1) li++;
  else if (gi < LECS.length - 1) { gi++; li = 0; }
  load();
}
function step(): void {
  stopTimer(); playing = false; setPlayBtn();
  if (complete) return;
  if (si < cur().st.length - 1) show(si + 1); else finish();
}
function back(): void { stopTimer(); playing = false; complete = false; setPlayBtn(); show(Math.max(0, si - 1), true); }

$("play").onclick = () => {
  if (complete) { replay(); return; }
  playing = !playing; setPlayBtn();
  if (playing) schedule(); else stopTimer();
};
$("rep").onclick = replay;
$("stp").onclick = step;
$("prv").onclick = back;
$("rst").onclick = () => { stopTimer(); playing = false; complete = false; setPlayBtn(); show(0, true); };
$<HTMLSelectElement>("spd").onchange = () => { speed = Number($<HTMLSelectElement>("spd").value); if (playing) schedule(); };
document.addEventListener("keydown", e => {
  if (e.target instanceof HTMLSelectElement) return;
  if (e.key === "ArrowRight") step();
  else if (e.key === "ArrowLeft") back();
  else if (e.key === " ") { e.preventDefault(); $("play").click(); }
  else if (e.key === "r" || e.key === "R") replay();
});

resize();
load();
requestAnimationFrame(frame);