import type { Sim } from "../hooks/useSim";

export function Controls({ sim }: { sim: Sim }) {
  const off = sim.n === 0;
  const atEnd = sim.pos >= sim.n - 1 && sim.phase === 1 && sim.n > 0;
  return (
    <div className="ctl">
      <select aria-label="Speed" value={sim.speed} onChange={e => sim.setSpeed(Number(e.target.value))}>
        {[0.5, 1, 2, 4].map(s => <option key={s} value={s}>{s}x</option>)}
      </select>
      <button aria-label="Previous packet" disabled={off || !sim.started} onClick={sim.back}>‹</button>
      <button className="primary" disabled={off} onClick={sim.toggle}>{sim.playing ? "PAUSE" : atEnd ? "REPLAY" : "PLAY"}</button>
      <button disabled={off || atEnd} onClick={sim.step}>STEP</button>
      <button disabled={off || !sim.started} onClick={sim.reset}>RESET</button>
    </div>
  );
}