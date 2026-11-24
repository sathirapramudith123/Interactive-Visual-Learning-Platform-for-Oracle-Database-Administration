import { useCallback, useEffect, useMemo, useState } from "react";
import type { Ev, Item, Packet } from "../types";

const RM = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const FL = RM ? 250 : 1100; // packet in flight (ms at 1x)
const DW = 550; // pause after it arrives (ms at 1x)

interface S { pos: number; phase: 0 | 1; t: number; playing: boolean; speed: number }
const init: S = { pos: -1, phase: 0, t: 0, playing: false, speed: 1 };

function adv(c: S, dt: number, n: number): S {
  if (!c.playing || n === 0) return c;
  let { pos, phase, t } = c;
  if (pos < 0) { pos = 0; phase = 0; t = 0; }
  if (phase === 0) {
    t += (dt * c.speed) / FL;
    if (t >= 1) { phase = 1; t = 0; }
  } else {
    t += (dt * c.speed) / DW;
    if (t >= 1) {
      if (pos >= n - 1) return { ...c, pos, phase: 1, t: 1, playing: false }; // end: back to PLAY
      pos++; phase = 0; t = 0;
    }
  }
  return { ...c, pos, phase, t };
}

export function useSim(item: Item) {
  const events = useMemo<Ev[]>(
    () => item.steps.flatMap((s, i) => (s.packets.length ? s.packets.map(pkt => ({ step: i, pkt })) : [{ step: i }])),
    [item],
  );
  const n = events.length;
  const [s, setS] = useState<S>(init);

  useEffect(() => {
    if (!s.playing) return;
    let last = performance.now(), raf = 0;
    const loop = (now: number): void => {
      const dt = Math.min(now - last, 60);
      last = now;
      setS(c => adv(c, dt, n));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [s.playing, n]);

  const toggle = useCallback(() => setS(c => {
    if (n === 0) return c;
    if (!c.playing && c.pos >= n - 1 && c.phase === 1) return { ...init, speed: c.speed, playing: true };
    return { ...c, playing: !c.playing };
  }), [n]);
  const step = useCallback(() => setS(c => {
    if (n === 0) return c;
    const next = c.pos < 0 ? 0 : c.phase === 0 ? c.pos : Math.min(n - 1, c.pos + 1);
    return { ...c, pos: next, phase: 1, t: 1, playing: false };
  }), [n]);
  const back = useCallback(() => setS(c => {
    const p = c.pos - 1;
    return p < 0 ? { ...init, speed: c.speed } : { ...c, pos: p, phase: 1, t: 1, playing: false };
  }), []);
  const reset = useCallback(() => setS(c => ({ ...init, speed: c.speed })), []);
  const setSpeed = useCallback((speed: number) => setS(c => ({ ...c, speed })), []);
  const jump = useCallback((step: number) => setS(c => {
    const idx = events.findIndex(e => e.step === step);
    return idx < 0 ? c : { ...c, pos: idx, phase: 0, t: 0, playing: false };
  }), [events]);

  const ev = s.pos >= 0 ? events[s.pos] : undefined;
  const rows: Packet[] = events.slice(0, Math.max(0, s.pos + (s.phase === 1 ? 1 : 0))).flatMap(e => (e.pkt ? [e.pkt] : []));
  return { ...s, n, ev, rows, started: s.pos >= 0, stepIdx: ev?.step ?? 0, toggle, step, back, reset, setSpeed, jump };
}
export type Sim = ReturnType<typeof useSim>;