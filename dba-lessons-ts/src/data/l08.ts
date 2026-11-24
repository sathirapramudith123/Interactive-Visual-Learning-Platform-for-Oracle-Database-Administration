import type { Item } from "../types";
import { lesson } from "./build";

export const l08: Item[] = [
  lesson("Lecture 8 · HA and DR", "High availability and DR", "Primary, standby and failover", "CORE", 8,
    [["p", "d", "Primary", "site A"], ["rl", "f", "Redo", "shipped over"], ["sb", "d", "Standby", "site B"], ["fo", "l", "Users", "reconnect"]],
    [
      ["High availability", "Use redundancy so there is no single point of failure. RAC runs several instances on shared storage. Failover should be as invisible as possible.", "High availability is not perfect availability.", "p"],
      ["Data Guard", "Changes made on the primary are sent as redo to the standby, synchronously or asynchronously.", "Active Data Guard also lets the standby serve queries.", "rl sb", "p>rl>sb", "REDO", "Redo shipping"],
      ["Disaster", "The primary site is lost because of a flood, an attack or a human error.", "DR = recover after a disruptive event.", "fo"],
      ["Failover", "The standby takes over and becomes the new primary. Users reconnect to site B.", "Test with regular DR drills.", "", "sb>fo", "FAILOVER", "New primary"],
      ["RPO and RTO", "RPO is how much data you can lose. RTO is how long you can be down. Backup and restore is cheapest and slowest, active/active is fastest and costs most.", "Smaller RPO and RTO cost more.", ""],
    ]),
];