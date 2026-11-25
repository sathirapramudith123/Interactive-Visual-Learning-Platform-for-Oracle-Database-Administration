import type { ReactNode } from "react";
import type { Ev, Item } from "../types";

interface Props { item: Item; ev?: Ev; stepIdx: number; showSteps: boolean; onOverview: () => void }

const RE = /(--.*$)|('(?:[^']|'')*')|\b(CREATE|TABLE|INSERT|INTO|VALUES|SELECT|FROM|WHERE|COMMIT|ROLLBACK|NUMBER|VARCHAR2|PRIMARY|KEY|TABLESPACE|DROP|UPDATE|SET|AND|ALTER|DATABASE)\b|(\b\d+\b)/gi;

// colour the SQL words, strings, numbers and comments
function hl(line: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0, k = 0;
  let m: RegExpExecArray | null;
  RE.lastIndex = 0;
  while ((m = RE.exec(line)) !== null) {
    if (m.index > last) out.push(line.slice(last, m.index));
    const cls = m[1] ? "c" : m[2] ? "s" : m[3] ? "k" : "n";
    out.push(<span key={k++} className={"sq-" + cls}>{m[0]}</span>);
    last = m.index + m[0].length;
  }
  out.push(line.slice(last));
  return out;
}

function Sql({ code }: { code: string }) {
  return (
    <pre className="sql" aria-label="SQL code">
      <code>{code.split("\n").map((ln, i) => <div key={i}>{hl(ln) || " "}</div>)}</code>
    </pre>
  );
}

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
        {step.code && <Sql code={step.code} />}
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