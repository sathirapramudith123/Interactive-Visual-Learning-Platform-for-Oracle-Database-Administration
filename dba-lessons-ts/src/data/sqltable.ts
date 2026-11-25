import type { Item } from "../types";
import { lesson } from "./build";

const CREATE = `CREATE TABLE employees (
  id     NUMBER PRIMARY KEY,
  name   VARCHAR2(50),
  dept   VARCHAR2(20),
  salary NUMBER
) TABLESPACE users;`;

export const sqlTable: Item[] = [
  lesson("Lecture 2 · Oracle architecture", "Create a table with SQL", "From CREATE TABLE to a row on disk", "CORE", 2,
    [
      ["u", "l", "You", "SQL*Plus", 110, 300],
      ["sp", "s", "Server process", "runs your SQL", 330, 300],
      ["dd", "f", "Data dictionary", "table definitions", 560, 120],
      ["bf", "c", "Buffer cache", "blocks in memory", 560, 300],
      ["rl", "f", "Redo log", "every change", 560, 480],
      ["ts", "d", "USERS tablespace", "where the table lives", 790, 120],
      ["sg", "k", "EMPLOYEES segment", "the table's space", 790, 300],
      ["bk", "c", "Data block", "holds the row", 790, 480],
    ],
    [
      ["Write the SQL", "You send a CREATE TABLE statement from SQL*Plus. The words TABLESPACE users say where the table's data will be stored.", "SQL is the language you use to talk to the database.", "u sp", "u>sp", "SQL*Net", "CREATE TABLE", undefined, CREATE],
      ["Definition to the dictionary", "The server process checks the statement, then records the table name, the column names and the data types in the data dictionary. The dictionary is owned by SYS and lives in the SYSTEM tablespace.", "The data dictionary remembers every table.", "dd", "sp>dd", "DDL", "Store definition", undefined, "-- stored in the data dictionary:\n-- table  EMPLOYEES\n-- columns id, name, dept, salary"],
      ["Space in a tablespace", "A table is stored as a segment inside a tablespace. A segment is made of extents, and an extent is a set of contiguous data blocks. Recent Oracle versions create the segment only when the first row is inserted.", "Tablespace, then segment, then extent, then block.", "ts sg", "dd>ts>sg", "ALLOC", "Table storage", undefined, "-- tablespace USERS\n--   segment EMPLOYEES\n--     extent > data blocks"],
      ["INSERT a row", "INSERT changes a data block in the buffer cache, in memory. Nothing is written to the data file yet. The change is also described as redo.", "Changes happen in memory first.", "bf", "u>sp>bf", "SQL*Net", "INSERT", undefined, "INSERT INTO employees\nVALUES (1, 'Nimal', 'IT', 85000);"],
      ["COMMIT makes it safe", "On COMMIT, LGWR writes the redo to the online redo log on disk. Now the row is safe even if the instance crashes.", "Redo on disk makes a commit safe.", "rl", "bf>rl", "REDO", "COMMIT", undefined, "COMMIT;"],
      ["The block reaches the file", "Later DBWn writes the changed block to the data file. The row now lives in a data block that belongs to the EMPLOYEES segment.", "Data files are written lazily.", "bk", "bf>bk", "WRITE", "Write block", undefined, "-- DBWn writes the block later\n-- (for example at a checkpoint)"],
      ["SELECT reads it back", "SELECT first looks in the buffer cache. If the block is there, Oracle returns the rows without touching the disk.", "Memory first, disk only when needed.", "", "u>sp>bf>sp>u", "SQL*Net", "SELECT", undefined, "SELECT * FROM employees\nWHERE dept = 'IT';"],
      ["Ask the dictionary", "The data dictionary knows where every table lives. This query asks it for the tablespace of EMPLOYEES. The answer is USERS.", "The dictionary can tell you where a table is stored.", "", "u>sp>dd>sp>u", "SQL*Net", "Dictionary query", undefined, "SELECT table_name, tablespace_name\nFROM user_tables\nWHERE table_name = 'EMPLOYEES';"],
    ],
    { e: [["u", "sp"], ["sp", "dd"], ["dd", "ts"], ["ts", "sg"], ["sg", "bk"], ["sp", "bf"], ["bf", "rl"], ["bf", "bk"]] }),
];