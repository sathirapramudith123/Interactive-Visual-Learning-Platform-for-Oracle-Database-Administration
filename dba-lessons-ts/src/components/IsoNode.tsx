import type { Kind } from "../types";

type XY = [number, number];
const iso = (x: number, y: number, z: number): XY => [(x - y) * 0.866, (x + y) * 0.5 - z];
const pts = (a: XY[]): string => a.map(p => p.join(",")).join(" ");

function Box({ x, y, z = 0, w, d, h }: { x: number; y: number; z?: number; w: number; d: number; h: number }) {
  const top = [iso(x, y, z + h), iso(x + w, y, z + h), iso(x + w, y + d, z + h), iso(x, y + d, z + h)];
  const right = [iso(x + w, y, z), iso(x + w, y + d, z), iso(x + w, y + d, z + h), iso(x + w, y, z + h)];
  const left = [iso(x, y + d, z), iso(x + w, y + d, z), iso(x + w, y + d, z + h), iso(x, y + d, z + h)];
  return (
    <g>
      <polygon className="o-l" points={pts(left)} />
      <polygon className="o-r" points={pts(right)} />
      <polygon className="o-t" points={pts(top)} />
    </g>
  );
}
function Line({ a, b }: { a: XY; b: XY }) {
  return <line className="o-ln" x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />;
}

function Laptop() {
  return (
    <g>
      <Box x={-30} y={-22} w={60} d={44} h={5} />
      {[-14, -4, 6].map(y => <Line key={y} a={iso(-24, y, 5)} b={iso(24, y, 5)} />)}
      <polygon className="o-t" points={pts([iso(-8, 8, 5), iso(8, 8, 5), iso(8, 16, 5), iso(-8, 16, 5)])} />
      <Box x={-30} y={-22} z={5} w={60} d={3} h={38} />
      <polygon className="o-scr" points={pts([iso(-26, -19, 9), iso(26, -19, 9), iso(26, -19, 38), iso(-26, -19, 38)])} />
      <Line a={iso(-20, -19, 30)} b={iso(6, -19, 30)} />
      <Line a={iso(-20, -19, 24)} b={iso(14, -19, 24)} />
      <Line a={iso(-20, -19, 18)} b={iso(0, -19, 18)} />
    </g>
  );
}
function Server() {
  return (
    <g>
      {[0, 15, 30].map(z => (
        <g key={z}>
          <Box x={-22} y={-18} z={z} w={44} d={36} h={13} />
          <polygon className="o-scr" points={pts([iso(-16, 18, z + 4), iso(8, 18, z + 4), iso(8, 18, z + 9), iso(-16, 18, z + 9)])} />
          <circle className="led" cx={iso(14, 18, z + 6.5)[0]} cy={iso(14, 18, z + 6.5)[1]} r="1.7" />
        </g>
      ))}
    </g>
  );
}
function Database() {
  const r = 26, ry = 13, top = -38, h = 40;
  return (
    <g>
      <path className="o-l" d={`M${-r} ${top} v${h} a${r} ${ry} 0 0 0 ${2 * r} 0 v${-h} z`} />
      {[h / 3, (2 * h) / 3].map(o => <path key={o} className="o-ln" d={`M${-r} ${top + o} a${r} ${ry} 0 0 0 ${2 * r} 0`} />)}
      <ellipse className="o-t" cx="0" cy={top} rx={r} ry={ry} />
      <ellipse className="o-ln" cx="0" cy={top} rx={r - 9} ry={ry - 4.5} />
    </g>
  );
}
function Shield() {
  return (
    <g>
      <Box x={-26} y={-26} w={52} d={52} h={5} />
      <g transform="translate(0 -9)">
        <path className="o-t" d="M0 -58 L24 -48 V-28 C24 -13 12 -5 0 0 C-12 -5 -24 -13 -24 -28 V-48 Z" />
        <path className="o-chk" d="M-9 -30 L-2 -22 L11 -40" />
      </g>
    </g>
  );
}
function Disk() {
  return (
    <g>
      <Box x={-28} y={-28} w={56} d={56} h={12} />
      <ellipse className="o-ln" cx="0" cy="-12" rx="22" ry="12" />
      <ellipse className="o-ln" cx="0" cy="-12" rx="6" ry="3.4" />
      <circle className="led" cx={iso(28, 12, 6)[0]} cy={iso(28, 12, 6)[1]} r="1.8" />
    </g>
  );
}
// memory chip: flat package with a die on top and pins on two sides
function Chip() {
  return (
    <g>
      <Box x={-26} y={-26} w={52} d={52} h={7} />
      <Box x={-13} y={-13} z={7} w={26} d={26} h={4} />
      {[-17, -7, 3, 13].map(o => <Line key={"a" + o} a={iso(-26, o, 3)} b={iso(-33, o, 3)} />)}
      {[-17, -7, 3, 13].map(o => <Line key={"b" + o} a={iso(o, 26, 3)} b={iso(o, 33, 3)} />)}
    </g>
  );
}
// document stack: three sheets with text lines
function Doc() {
  return (
    <g>
      {[0, 6, 12].map(z => <Box key={z} x={-24} y={-30} z={z} w={48} d={60} h={4} />)}
      {[-20, -10, 0, 10].map(y => <Line key={y} a={iso(-14, y, 16)} b={iso(14, y, 16)} />)}
    </g>
  );
}

export function IsoNode({ kind, glow }: { kind: Kind; glow: boolean }) {
  return (
    <g className={"iso" + (glow ? " glow" : "")}>
      <ellipse className="o-shadow" cx="0" cy="10" rx="48" ry="16" />
      {kind === "laptop" && <Laptop />}
      {kind === "server" && <Server />}
      {kind === "db" && <Database />}
      {kind === "shield" && <Shield />}
      {kind === "disk" && <Disk />}
      {kind === "chip" && <Chip />}
      {kind === "doc" && <Doc />}
    </g>
  );
}