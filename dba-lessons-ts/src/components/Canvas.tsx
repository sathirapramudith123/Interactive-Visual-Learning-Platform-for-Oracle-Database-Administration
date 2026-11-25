import { useMemo } from "react";
import type { Item, NodeDef, Packet, PType } from "../types";
import { IsoNode } from "./IsoNode";
import { useViewBox, type VB } from "../hooks/useViewBox";

type XY = [number, number];
export const TYPE_COLOR: Record<PType, string> = {
  req: "var(--req)", res: "var(--res)", adm: "var(--adm)", sec: "var(--sec)", bak: "var(--bak)",
};
const anchor = (n: NodeDef): XY => [n.x, n.y - 22];

// where a link starts and ends, kept clear of the objects
export function ends(a: NodeDef, b: NodeDef): [XY, XY] {
  const A = anchor(a), B = anchor(b), dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1, m = 58;
  return [[A[0] + (dx / L) * m, A[1] + (dy / L) * m], [B[0] - (dx / L) * m, B[1] - (dy / L) * m]];
}

export function Edge({ a, b, on, glow }: { a: NodeDef; b: NodeDef; on: boolean; glow: boolean }) {
  const [p, q] = ends(a, b);
  const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
  const ang = (Math.atan2(q[1] - p[1], q[0] - p[0]) * 180) / Math.PI;
  return (
    <g className={"edgeg" + (glow ? " glow" : "")} style={{ opacity: on ? 1 : 0 }}>
      <line className="edge" x1={p[0]} y1={p[1]} x2={q[0]} y2={q[1]} />
      <path className="chev" d="M-8 -7 L8 0 L-8 7 Z" transform={`translate(${mx} ${my}) rotate(${ang})`} />
    </g>
  );
}

export function PacketDot({ from, to, t, type, label, payload }: { from: XY; to: XY; t: number; type: PType; label: string; payload: string }) {
  const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const x = from[0] + (to[0] - from[0]) * e, y = from[1] + (to[1] - from[1]) * e;
  const w = Math.max(label.length, payload.length) * 6.8 + 18, c = TYPE_COLOR[type];
  return (
    <g transform={`translate(${x} ${y})`} className="pkt">
      <circle r="15" fill={c} opacity="0.22" />
      <circle r="6" fill={c} />
      <g transform="translate(0 -34)">
        <rect x={-w / 2} y="-17" width={w} height="34" fill="var(--panel-solid)" stroke={c} />
        <text y="-4" textAnchor="middle" className="pl" fill={c}>{label}</text>
        <text y="10" textAnchor="middle" className="pp">{payload}</text>
      </g>
    </g>
  );
}

function Sequence({ cols, rows }: { cols: NodeDef[]; rows: Packet[] }) {
  const gap = Math.min(170, 700 / Math.max(cols.length, 1));
  const xs = (id: string): number => 70 + cols.findIndex(c => c.id === id) * gap;
  const H = Math.max(260, 110 + rows.length * 34);
  return (
    <svg className="seq" viewBox={`0 0 ${140 + gap * cols.length} ${H}`} role="img" aria-label="Sequence diagram of the packets so far">
      <defs><marker id="sarr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1 1L9 5L1 9z" fill="var(--acc)" /></marker></defs>
      {cols.map(c => (
        <g key={c.id}>
          <text x={xs(c.id)} y="26" textAnchor="middle" className="nm">{c.name}</text>
          <line x1={xs(c.id)} y1="38" x2={xs(c.id)} y2={H - 10} className="life" />
        </g>
      ))}
      {rows.map((r, i) => {
        const y = 70 + i * 34, a = xs(r.src), b = xs(r.dst);
        return (
          <g key={i}>
            <line x1={a} y1={y} x2={b + (b > a ? -6 : 6)} y2={y} stroke={TYPE_COLOR[r.type]} strokeWidth="2" markerEnd="url(#sarr)" />
            <text x={(a + b) / 2} y={y - 6} textAnchor="middle" className="sb">{r.label}</text>
          </g>
        );
      })}
      {rows.length === 0 && <text x="20" y="70" className="sb">No packets on the wire yet.</text>}
    </svg>
  );
}

interface Props {
  item: Item; visible: string[]; pkt?: Packet; t: number; phase: 0 | 1;
  view: "network" | "sequence"; rows: Packet[];
}

export function Canvas({ item, visible, pkt, t, phase, view, rows }: Props) {
  const vis = new Set(visible);
  const vn = item.nodes.filter(n => vis.has(n.id));
  const target = useMemo<VB>(() => {
    if (!vn.length) return [0, 0, 900, 520];
    const xs = vn.map(n => n.x), ys = vn.map(n => n.y);
    const x0 = Math.min(...xs) - 110, x1 = Math.max(...xs) + 190, y0 = Math.min(...ys) - 120, y1 = Math.max(...ys) + 50;
    let w = Math.max(x1 - x0, 560), h = Math.max(y1 - y0, 320);
    if (w / h < 16 / 9) w = (h * 16) / 9; else h = (w * 9) / 16;
    return [(x0 + x1) / 2 - w / 2, (y0 + y1) / 2 - h / 2, w, h];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible.join(), item]);
  const viewBox = useViewBox(target);

  if (!item.steps.length) return <div className="empty">Coming soon: add a data file for “{item.name}”.</div>;
  if (view === "sequence") return <div className="seqwrap"><Sequence cols={vn} rows={rows} /></div>;

  const byId = (id: string): NodeDef | undefined => item.nodes.find(n => n.id === id);
  const src = pkt ? byId(pkt.src) : undefined, dst = pkt ? byId(pkt.dst) : undefined;
  const glowSet = new Set<string>(pkt ? [pkt.src, pkt.dst] : []);

  return (
    <svg className="map" viewBox={viewBox} role="img" aria-label={`Isometric diagram: ${item.name}`}>
      <defs><marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1 1L9 5L1 9z" fill="var(--acc)" /></marker></defs>
      {item.edges.map(([a, b]) => {
        const A = byId(a), B = byId(b);
        if (!A || !B) return null;
        const on = vis.has(a) && vis.has(b);
        const glow = !!pkt && ((pkt.src === a && pkt.dst === b) || (pkt.src === b && pkt.dst === a));
        return <Edge key={a + b} a={A} b={B} on={on} glow={glow} />;
      })}
      {item.nodes.map(n => {
        const v = vis.has(n.id);
        return (
          <g key={n.id} className="node" style={{ transform: `translate(${n.x}px,${n.y}px) scale(${v ? 1 : 0.6})`, opacity: v ? 1 : 0, pointerEvents: "none" }}>
            <IsoNode kind={n.kind} glow={glowSet.has(n.id)} />
            <text className="nm" x="66" y="-20">{n.name}</text>
            <text className="sb" x="66" y="-6">{n.sub}</text>
          </g>
        );
      })}
      {pkt && phase === 0 && src && dst && (() => {
        const [p, q] = ends(src, dst);
        return <PacketDot from={p} to={q} t={t} type={pkt.type} label={pkt.label} payload={pkt.payload} />;
      })()}
    </svg>
  );
}