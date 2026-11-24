export type Kind = "laptop" | "server" | "db" | "shield" | "disk" | "chip" | "doc";
export type PType = "req" | "res" | "adm" | "sec" | "bak";
export type Cat = "CORE" | "APPLICATION" | "SECURITY";

export interface Packet {
  time: string; src: string; dst: string; proto: string; info: string; size: string;
  type: PType; label: string; payload: string;
}
export interface Step {
  title: string; subtitle: string; explanation: string;
  details: [string, string][];
  visibleNodes: string[];
  activeEdge?: [string, string];
  packets: Packet[];
}
export interface NodeDef { id: string; kind: Kind; name: string; sub: string; x: number; y: number }
export interface Item {
  id: string; name: string; sub: string; cat: Cat; layer: number; blurb: string;
  overview: [string, string][];
  nodes: NodeDef[]; edges: [string, string][]; steps: Step[];
}
export interface Ev { step: number; pkt?: Packet }