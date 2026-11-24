import type { RefObject } from "react";
import { TOPIC } from "../data";

interface Props {
  theme: "dark" | "light"; onTheme: () => void;
  layers: number[]; layer: number; onLayer: (n: number) => void;
  query: string; onQuery: (q: string) => void; searchRef: RefObject<HTMLInputElement>;
  onSide: () => void; onFlow: () => void;
}

export function Header({ theme, onTheme, layers, layer, onLayer, query, onQuery, searchRef, onSide, onFlow }: Props) {
  return (
    <header className="hdr">
      <div className="brand">
        <svg className="logo" viewBox="0 0 48 48" aria-hidden="true">
          <path d="M4 14V4h10M34 4h10v10M44 34v10H34M14 44H4V34" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M24 12l12 7v10l-12 7-12-7V19z M24 24l12-5 M24 24l-12-5 M24 24v12" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </svg>
        <div>
          <h1>{TOPIC.title} <i>{TOPIC.accent}</i></h1>
          <p>{TOPIC.tagline}</p>
        </div>
      </div>
      <div className="layers" role="group" aria-label="Filter by lecture">
        <span className="cap">LECTURE</span>
        {layers.map(n => (
          <button key={n} className={"chip" + (layer === n ? " on" : "")} aria-pressed={layer === n} onClick={() => onLayer(layer === n ? 0 : n)}>{n === 12 ? "G" : n}</button>
        ))}
      </div>
      <label className="search">
        <span aria-hidden="true">⌕</span>
        <input ref={searchRef} value={query} onChange={e => onQuery(e.target.value)} placeholder="Search lessons" aria-label="Search lessons" />
        <kbd>Ctrl K</kbd>
      </label>
      <div className="tools">
        <button className="ib" aria-label="Show or hide the lesson list" title="Lesson list" onClick={onSide}>▤</button>
        <button className="ib" aria-label="Show or hide the packet flow" title="Packet flow" onClick={onFlow}>▥</button>
        <button className="ib" aria-label="Full screen" title="Full screen" onClick={() => { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen(); }}>⛶</button>
        <select aria-label="Language" defaultValue="EN"><option value="EN">EN</option></select>
        <button className="ib" aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"} title="Theme (T)" onClick={onTheme}>{theme === "dark" ? "☀" : "☾"}</button>
      </div>
      <div className="credit"><span>DESIGNED BY</span><b>{TOPIC.credit}</b></div>
    </header>
  );
}