import type { Item, Packet, PType } from "../types";

const P = (time: string, src: string, dst: string, proto: string, info: string, size: string, type: PType, label: string, payload: string): Packet =>
  ({ time, src, dst, proto, info, size, type, label, payload });

export const dba: Item = {
  id: "dba", name: "What a DBA does", sub: "DBMS, users and the DBA role", cat: "CORE", layer: 1,
  blurb: "A database administrator keeps the database available, secure, fast and recoverable. Watch how users, applications, the DBMS, the DBA, security and backups work together.",
  overview: [
    ["LECTURE", "1 · Introduction"],
    ["FOCUS", "Keep data available, secure and fast"],
    ["KEY TASKS", "Install, monitor, secure, back up, tune"],
    ["TOOLS", "SQL*Plus, Enterprise Manager"],
    ["SKILLS", "SQL, architecture, problem solving"],
    ["SOURCE", "IT4040 Lecture 1"],
  ],
  nodes: [
    { id: "users", kind: "laptop", name: "Users", sub: "end users", x: 110, y: 300 },
    { id: "apps", kind: "server", name: "Applications", sub: "app tier", x: 320, y: 160 },
    { id: "dbms", kind: "db", name: "DBMS", sub: "Oracle database", x: 540, y: 300 },
    { id: "dba", kind: "laptop", name: "DBA", sub: "you", x: 320, y: 440 },
    { id: "sec", kind: "shield", name: "Security", sub: "access, audit", x: 760, y: 160 },
    { id: "bak", kind: "disk", name: "Backup", sub: "recovery copy", x: 760, y: 440 },
  ],
  edges: [["users", "apps"], ["apps", "dbms"], ["dba", "dbms"], ["sec", "apps"], ["sec", "dbms"], ["dbms", "bak"]],
  steps: [
    {
      title: "Users need data", subtitle: "Every system starts with people",
      explanation: "End users work through applications. They never touch the database files directly.",
      details: [["WHO", "End users"], ["ACCESS", "Through applications only"], ["GOAL", "Read and change data"]],
      visibleNodes: ["users"], packets: [],
    },
    {
      title: "Apps talk to the DBMS", subtitle: "Users, applications and the database",
      explanation: "The application turns a user action into SQL. The DBMS stores and retrieves the data and answers back. It also handles transactions, concurrency and integrity.",
      details: [["DBMS", "Software that manages the database"], ["LANGUAGE", "SQL"], ["GUARANTEE", "ACID transactions"]],
      visibleNodes: ["users", "apps", "dbms"], activeEdge: ["apps", "dbms"],
      packets: [
        P("0.000s", "users", "apps", "HTTPS", "Place order", "640 B", "req", "HTTP REQUEST", "POST /orders"),
        P("0.120s", "apps", "dbms", "SQL*Net", "INSERT INTO orders ...", "218 B", "req", "SQL INSERT", "INSERT INTO orders"),
        P("0.180s", "dbms", "apps", "SQL*Net", "1 row created, COMMIT done", "96 B", "res", "SQL RESULT", "1 row created"),
        P("0.240s", "apps", "users", "HTTPS", "Order confirmed", "1.2 KB", "res", "HTTP RESPONSE", "200 OK"),
      ],
    },
    {
      title: "The DBA looks after it", subtitle: "Install, configure, monitor, tune",
      explanation: "The DBA installs and configures the DBMS, watches performance, and tunes queries and storage. DBAs connect with administrative privileges such as SYSDBA.",
      details: [["ROLE", "Database administrator"], ["TASKS", "Configure, monitor, optimize"], ["PRIVILEGE", "SYSDBA"]],
      visibleNodes: ["users", "apps", "dbms", "dba"], activeEdge: ["dba", "dbms"],
      packets: [
        P("1.000s", "dba", "dbms", "SYSDBA", "connect / as sysdba", "120 B", "adm", "ADMIN LOGIN", "sysdba"),
        P("1.100s", "dbms", "dba", "SQL*Net", "Instance OPEN, sessions normal", "180 B", "res", "STATUS", "OPEN"),
        P("1.250s", "dba", "dbms", "SQL*Net", "Monitor performance, tune slow SQL", "160 B", "adm", "TUNING", "AWR / ADDM"),
      ],
    },
    {
      title: "Security protects the data", subtitle: "Authenticate, then authorize",
      explanation: "Before data is returned, the user is authenticated and only the least privilege needed is granted. Encryption and auditing protect and record access.",
      details: [["PRINCIPLE", "Least privilege"], ["AT REST", "TDE encryption"], ["RECORD", "Auditing"]],
      visibleNodes: ["users", "apps", "dbms", "dba", "sec"], activeEdge: ["sec", "dbms"],
      packets: [
        P("2.000s", "apps", "sec", "AUTH", "Authenticate user (password, MFA)", "240 B", "sec", "AUTHENTICATE", "user + MFA"),
        P("2.120s", "sec", "dbms", "GRANT", "Allow SELECT only (least privilege)", "150 B", "sec", "AUTHORIZE", "SELECT only"),
      ],
    },
    {
      title: "Backup and recovery", subtitle: "Plan for the day a disk fails",
      explanation: "The DBA schedules backups and tests restores. A backup is only real once it has been restored successfully.",
      details: [["TOOL", "RMAN"], ["TEST", "Restore regularly"], ["GOAL", "Small RPO and RTO"]],
      visibleNodes: ["users", "apps", "dbms", "dba", "sec", "bak"], activeEdge: ["dbms", "bak"],
      packets: [
        P("3.000s", "dbms", "bak", "RMAN", "Full backup copy", "2.4 GB", "bak", "BACKUP", "full backup"),
        P("3.400s", "bak", "dbms", "RMAN", "Restore after disk failure", "2.4 GB", "bak", "RESTORE", "restore + recover"),
      ],
    },
  ],
};