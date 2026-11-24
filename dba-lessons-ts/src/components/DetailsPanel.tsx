import type { Ev, Item } from "../types";

interface Props { item: Item; ev?: Ev; stepIdx: number; showSteps: boolean; onOverview: () => void }

export function DetailsPanel({ item, ev, stepIdx, showSteps, onOverview }: Props) {
  const step = item.steps[stepIdx];
  const name = (id: string): string => item.nodes.find(n => n.id === id)?.name ?? id;

  if (showSteps && step) {
    return (
      <aside className="card info" aria-live="polite">
        <div className="ihead"><h2>STEP DETAILS</h2><button className="link" onClick={onOverview}>‹ OVERVIEW</button></div>
        <div className="tag">STEP {stepIdx + 1} OF {item.steps.length}</div>
        <h3>{step.title}</h3>
        <p className="subt">{step.subtitle}</p>
        <p>{step.explanation}</p>
        {ev?.pkt && <div className="msg">{ev.pkt.label}, {name(ev.pkt.src).toUpperCase()} -&gt; {name(ev.pkt.dst).toUpperCase()}</div>}
        <table className="kv"><tbody>{step.details.map(([k, v]) => <tr key={k}><th>{k}</th><td>{v}</td></tr>)}</tbody></table>
      </aside>
    );
  }
  return (
    <aside className="card info">
      <div className="ihead"><h2>OVERVIEW</h2></div>
      <h3>{item.name}</h3>
      <span className="badge">{item.steps.length ? "ACTIVE" : "COMING SOON"}</span>
      <p>{item.blurb}</p>
      <table className="kv"><tbody>{item.overview.map(([k, v]) => <tr key={k}><th>{k}</th><td>{v}</td></tr>)}</tbody></table>
    </aside>
  );
}