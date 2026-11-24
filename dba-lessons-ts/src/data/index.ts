import type { Cat, Item } from "../types";
import { dba } from "./dba";

export const TOPIC = {
  title: "DBA",
  accent: "EXPLORER",
  tagline: "LEARN HOW ORACLE DBA WORKS",
  credit: "YOUR NAME", // change this to your name
};

const soon = (id: string, name: string, sub: string, cat: Cat, layer: number, src: string): Item => ({
  id, name, sub, cat, layer,
  blurb: "This lesson is not built yet. Add a data file with its nodes and steps, in the same shape as dba.ts.",
  overview: [["LECTURE", src], ["STATUS", "Coming soon"]],
  nodes: [], edges: [], steps: [],
});

export const ITEMS: Item[] = [
  dba,
  soon("arch", "Oracle architecture", "Instance, SGA, files", "CORE", 2, "2 · Oracle architecture"),
  soon("inst", "Installation", "Plan, install, configure", "CORE", 3, "3 · Installation"),
  soon("net", "Network and listener", "Connect to the database", "APPLICATION", 5, "5 · Network"),
  soon("secu", "Database security", "Users, privileges, TDE", "SECURITY", 6, "6 · Security"),
  soon("rec", "Backup and recovery", "Recovery models, log shipping", "CORE", 11, "11 · Recovery"),
];