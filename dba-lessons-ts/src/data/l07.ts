import type { Item } from "../types";
import { lesson } from "./build.js";

export const l07: Item[] = [
  lesson("Lecture 7 · Performance", "Performance tuning", "From SQL to execution plan to tuning", "APPLICATION", 7,
    [["q", "l", "SQL query", "from the app"], ["op", "c", "Optimizer", "uses statistics"], ["pl", "f", "Plan", "index or scan"], ["ex", "d", "Execute", "reads data"], ["tu", "s", "Tune", "AWR, ADDM"]],
    [
      ["Measure first", "Watch throughput, response time, concurrency and CPU, memory and I/O. Tuning is a loop: measure, find the bottleneck, change, measure again.", "Never tune by guessing.", "q"],
      ["Optimizer", "The cost-based optimizer picks a plan using table, column and index statistics. Bad statistics lead to bad plans.", "Keep statistics fresh (DBMS_STATS).", "op", "q>op", "PARSE", "Optimize"],
      ["Execution plan", "The plan shows the join method and whether it uses a full scan or an index. See it with EXPLAIN PLAN or AUTOTRACE.", "B-tree for high cardinality, bitmap for low.", "pl", "op>pl", "PLAN", "Execution plan"],
      ["Execute", "Oracle runs the plan, reading from the buffer cache or from disk. Use bind variables to cut parsing.", "Less physical I/O means faster queries.", "ex", "pl>ex", "I/O", "Run the plan"],
      ["Find and fix", "AWR snapshots and ADDM advice show heavy SQL and wait events. Then add indexes, rewrite SQL, tune memory (SGA, PGA) and spread I/O.", "V$ views show live data, AWR shows history.", "tu", "ex>tu", "AWR", "Findings"],
    ]),
];