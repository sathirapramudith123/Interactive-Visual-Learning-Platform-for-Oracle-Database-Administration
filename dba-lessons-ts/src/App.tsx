import { useEffect, useMemo, useRef, useState } from "react";
import { ITEMS } from "./data";
import type { Cat } from "./types";
import { useSim } from "./hooks/useSim";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { Canvas } from "./components/Canvas";
import { DetailsPanel } from "./components/DetailsPanel";
import { PacketTable } from "./components/PacketTable";

type Filter = "ALL" | Cat;

export default function App() {
  const [id, setId] = useState(ITEMS[0].id);
  const [cat, setCat] = useState<Filter>("ALL");
  const [layer, setLayer] = useState(0);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"network" | "sequence">("network");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [showSide, setShowSide] = useState(true);
  const [showFlow, setShowFlow] = useState(true);
  const [overview, setOverview] = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);

  const item = ITEMS.find(i => i.id === id) ?? ITEMS[0];
  const sim = useSim(item);
  const layers = useMemo(() => [...new Set(ITEMS.map(i => i.layer))].sort((a, b) => a - b), []);
  const shown = ITEMS.filter(i =>
    (cat === "ALL" || i.cat === cat) && (!layer || i.layer === layer) &&
    (i.name + " " + i.sub).toLowerCase().includes(query.toLowerCase()));

  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => { sim.reset(); setOverview(true); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);
  useEffect(() => { setOverview(!sim.started); }, [sim.started, sim.pos]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); searchRef.current?.focus(); return; }
      const t = e.target as HTMLElement;
      if (["INPUT", "SELECT", "TEXTAREA"].includes(t.tagName)) return;
      if (e.key === " " && t.tagName !== "BUTTON") { e.preventDefault(); sim.toggle(); }
      else if (e.key === "ArrowRight") sim.step();
      else if (e.key === "ArrowLeft") sim.back();
      else if (e.key.toLowerCase() === "r") sim.reset();
      else if (e.key.toLowerCase() === "t") setTheme(x => (x === "dark" ? "light" : "dark"));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sim]);

  const step = item.steps[sim.stepIdx];
  const visible = step ? step.visibleNodes : [];

  return (
    <div className={"app" + (showSide ? "" : " noside") + (showFlow ? "" : " noflow")}>
      <Header theme={theme} onTheme={() => setTheme(x => (x === "dark" ? "light" : "dark"))}
        layers={layers} layer={layer} onLayer={setLayer} query={query} onQuery={setQuery} searchRef={searchRef}
        onSide={() => setShowSide(v => !v)} onFlow={() => setShowFlow(v => !v)} />
      <div className="body">
        {showSide && (
          <Sidebar items={shown} all={ITEMS} sel={item.id} onSel={setId} cat={cat} onCat={setCat}
            started={sim.started} stepIdx={sim.stepIdx} onStep={sim.jump} />
        )}
        <main className="card stage">
          <div className="vsw" role="tablist">
            <button role="tab" aria-selected={view === "network"} className={view === "network" ? "on" : ""} onClick={() => setView("network")}>NETWORK</button>
            <button role="tab" aria-selected={view === "sequence"} className={view === "sequence" ? "on" : ""} onClick={() => setView("sequence")}>SEQUENCE</button>
          </div>
          <div className="canvas">
            <Canvas item={item} visible={visible} pkt={sim.ev?.pkt} t={sim.t} phase={sim.phase} view={view} rows={sim.rows} />
          </div>
        </main>
        <DetailsPanel item={item} ev={sim.ev} stepIdx={sim.stepIdx} showSteps={sim.started && !overview} onOverview={() => setOverview(true)} />
        {showFlow && <PacketTable item={item} rows={sim.rows} sim={sim} />}
      </div>
    </div>
  );
}