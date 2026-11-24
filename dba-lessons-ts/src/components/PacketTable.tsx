import type { Item, Packet } from "../types";
import { TYPE_COLOR } from "./Canvas";
import type { Sim } from "../hooks/useSim";
import { Controls } from "./Controls";

export function PacketTable({ item, rows, sim }: { item: Item; rows: Packet[]; sim: Sim }) {
  const name = (id: string): string => item.nodes.find(n => n.id === id)?.name ?? id;
  const legend: [string, string][] = [["REQUEST", "req"], ["RESPONSE", "res"], ["ADMIN", "adm"], ["SECURITY", "sec"], ["BACKUP", "bak"]];
  return (
    <section className="card flow" aria-label="Packet flow">
      <div className="fhead">
        <h2>PACKET FLOW</h2>
        <div className="legend">
          {legend.map(([l, k]) => <span key={k}><i style={{ background: `var(--${k})` }} />{l}</span>)}
          <em>Sizes are illustrative</em>
        </div>
        <Controls sim={sim} />
      </div>
      <div className="twrap">
        <table>
          <thead><tr><th>NO.</th><th>TIME</th><th>SOURCE</th><th>DESTINATION</th><th>PROTOCOL</th><th>INFO</th><th>SIZE</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={i === rows.length - 1 ? "latest" : ""}>
                <td><span className="bub" style={{ background: TYPE_COLOR[r.type] }}>{i + 1}</span></td>
                <td>{r.time}</td><td>{name(r.src)}</td><td>{name(r.dst)}</td><td>{r.proto}</td><td className="inf">{r.info}</td><td>{r.size}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="none">No packets on the wire yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}