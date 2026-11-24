import type { Item } from "../types";
import { lesson } from "./build";

export const l10: Item[] = [
  lesson("Lecture 10 · Database types", "Transactions and CAP", "ACID, locking, CAP and NoSQL", "APPLICATION", 10,
    [["t", "l", "Transaction", "BEGIN to COMMIT"], ["ac", "h", "ACID", "all or nothing"], ["lk", "s", "Locks", "pessimistic"], ["cp", "c", "CAP", "pick two"], ["ns", "d", "NoSQL", "document, graph"]],
    [
      ["Transactions", "Related statements are grouped so they all succeed or all fail. ACID means atomic, consistent, isolated and durable.", "COMMIT keeps changes, ROLLBACK undoes them.", "t ac", "t>ac", "TXN", "Begin to commit"],
      ["Concurrency", "Pessimistic control locks data until commit or rollback and can deadlock. Optimistic control works on a copy and aborts on conflict.", "Keep transactions short, same resource order.", "lk", "ac>lk", "LOCK", "Lock rows"],
      ["CAP theorem", "A distributed system can guarantee only two of consistency, availability and partition tolerance.", "Network partitions happen, so the real choice is C or A.", "cp", "lk>cp", "CAP", "Choose two"],
      ["Eventual consistency", "If writes stop, all replicas catch up. In the meantime a read may be stale.", "Trade accuracy for speed and uptime.", ""],
      ["NoSQL types", "Document stores such as MongoDB, graph databases such as Neo4j, and time-series databases. NewSQL like Spanner keeps SQL and ACID at global scale.", "RDBMS, then NoSQL, then NewSQL.", "ns", "cp>ns", "NOSQL", "Scale out"],
    ]),
];