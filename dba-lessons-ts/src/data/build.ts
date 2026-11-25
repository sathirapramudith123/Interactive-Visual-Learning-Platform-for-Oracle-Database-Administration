import type { Cat, Item, Kind, NodeDef, Packet, PType, Step } from "../types";

// l laptop, s server, d database, h shield, k disk, c memory chip, f document
const K: Record<string, Kind> = { l: "laptop", s: "server", d: "db", h: "shield", k: "disk", c: "chip", f: "doc" };
// node: [id, kind, name, sub, x?, y?]
export type NT = [string, string, string, string, number?, number?];
// step: [title, explanation, key idea, new nodes, route "a>b>c", protocol, label, packet type]
export type ST = [string, string, string, string, string?, string?, string?, PType?];
interface Opt { e?: [string, string][]; hub?: boolean }
const SIZES = ["96 B", "140 B", "218 B", "512 B", "1.2 KB", "64 B", "340 B", "720 B"];

function layout(nodes: NT[], hub: boolean): NodeDef[] {
  const n = nodes.length, per = n <= 4 ? n : 3;
  return nodes.map((v, i) => {
    let x: number, y: number;
    if (v[4] !== undefined && v[5] !== undefined) { x = v[4]; y = v[5]; }
    else if (hub) {
      if (i === 0) { x = 480; y = 300; }
      else {
        const a = ((-90 + ((i - 1) * 360) / (n - 1)) * Math.PI) / 180;
        x = 480 + 330 * Math.cos(a); y = 300 + 190 * Math.sin(a);
      }
    } else {
      const r = Math.floor(i / per), c0 = i % per, c = r % 2 ? per - 1 - c0 : c0;
      x = 120 + c * 250; y = n <= 4 ? 300 : 170 + r * 210;
    }
    return { id: v[0], kind: K[v[1]], name: v[2], sub: v[3], x: Math.round(x), y: Math.round(y) };
  });
}

export function lesson(lec: string, name: string, sub: string, cat: Cat, layer: number, nodes: NT[], steps: ST[], opt: Opt = {}): Item {
  const ns = layout(nodes, !!opt.hub);
  const nm = (id: string): string => ns.find(x => x.id === id)?.name ?? id;
  const edges: [string, string][] = [...(opt.e ?? (opt.hub
    ? ns.slice(1).map(x => [ns[0].id, x.id] as [string, string])
    : ns.slice(1).map((x, i) => [ns[i].id, x.id] as [string, string])))];
  const has = (a: string, b: string): boolean => edges.some(e => (e[0] === a && e[1] === b) || (e[0] === b && e[1] === a));
  const seen: string[] = [];
  const add = (id: string): void => { if (id && !seen.includes(id)) seen.push(id); };
  let pk = 0;

  const out: Step[] = steps.map(([title, ex, key, v, route, proto, label, ty], i) => {
    const before = [...seen];
    const fresh = v.split(" ").filter(x => x && !before.includes(x));
    let paths: string[][] = [];
    let auto = false;
    if (route) paths = [route.split(">")];
    else {
      // no route given: connect each new object to the nearest object already on screen
      auto = true;
      fresh.forEach(id => {
        const e = edges.find(q => (q[0] === id && before.includes(q[1])) || (q[1] === id && before.includes(q[0])));
        if (e) paths.push(e[0] === id ? [id, e[1]] : [e[0], id]);
      });
    }
    v.split(" ").forEach(add);
    paths.forEach(p => p.forEach(add));
    // every hop a packet takes gets a visible line
    paths.forEach(p => p.slice(1).forEach((b, k) => { if (!has(p[k], b)) edges.push([p[k], b]); }));

    const lab = (label ?? title).toUpperCase().slice(0, 18);
    let j = 0;
    const packets: Packet[] = paths.flatMap(p => p.slice(1).map((dst, k) => {
      const src = p[k];
      const type: PType = ty ?? (auto ? "adm" : k === 0 ? "req" : "res");
      return {
        time: (i + j++ * 0.12).toFixed(3) + "s", src, dst, proto: proto ?? "LINK", info: `${title}: ${key}`,
        size: SIZES[pk++ % SIZES.length], type, label: lab, payload: `${nm(src)} > ${nm(dst)}`,
      };
    }));
    return {
      title, subtitle: sub, explanation: ex,
      details: [["KEY IDEA", key], ["PROTOCOL", proto ?? "-"], ["LECTURE", lec]],
      visibleNodes: [...seen],
      activeEdge: paths[0] && paths[0].length > 1 ? ([paths[0][0], paths[0][1]] as [string, string]) : undefined,
      packets,
    };
  });

  const from = layer === 12 ? "Oracle Database Administrator's Guide 19c" : `IT4040 Lecture ${layer}`;
  return {
    id: `${layer}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name, sub: lec, cat, layer,
    blurb: `${sub}. Press PLAY to watch it step by step, or click a step in the list.`,
    overview: [["LECTURE", lec], ["TOPIC", sub], ["STEPS", String(steps.length)], ["SOURCE", from]],
    nodes: ns, edges, steps: out,
  };
}