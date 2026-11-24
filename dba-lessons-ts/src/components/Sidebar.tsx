import type { Cat, Item } from "../types";

type Filter = "ALL" | Cat;
interface Props {
  items: Item[]; all: Item[]; sel: string; onSel: (id: string) => void;
  cat: Filter; onCat: (c: Filter) => void;
  started: boolean; stepIdx: number; onStep: (i: number) => void;
}

export function Sidebar({ items, all, sel, onSel, cat, onCat, started, stepIdx, onStep }: Props) {
  const tabs: Filter[] = ["ALL", "CORE", "APPLICATION", "SECURITY"];
  const count = (c: Filter): number => (c === "ALL" ? all.length : all.filter(i => i.cat === c).length);
  return (
    <nav className="card side" aria-label="Lessons">
      <h2>IT4040 LESSONS</h2>
      <div className="ftabs" role="tablist">
        {tabs.map(t => (
          <button key={t} role="tab" aria-selected={cat === t} className={cat === t ? "on" : ""} onClick={() => onCat(t)}>{t} <em>{count(t)}</em></button>
        ))}
      </div>
      <ul className="list">
        {items.map(it => {
          const open = it.id === sel;
          return (
            <li key={it.id} className={open ? "sel" : ""}>
              <button className="row" aria-expanded={open} onClick={() => onSel(it.id)}>
                <span className={"dot" + (it.steps.length ? " ok" : "")} aria-hidden="true" />
                <span><b>{it.name}</b><small>{it.sub}</small></span>
                <span className="chev" aria-hidden="true">{open ? "⌄" : "›"}</span>
              </button>
              {open && it.steps.length > 0 && (
                <ol className="steps">
                  {it.steps.map((s, i) => {
                    const done = started && i < stepIdx, now = started && i === stepIdx;
                    return (
                      <li key={s.title}>
                        <button className={done ? "done" : now ? "now" : ""} onClick={() => onStep(i)}>
                          <span className="num">{done ? "✓" : i + 1}</span>
                          <span><b>{s.title}</b></span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              )}
            </li>
          );
        })}
        {items.length === 0 && <li className="none">No lessons match.</li>}
      </ul>
    </nav>
  );
}