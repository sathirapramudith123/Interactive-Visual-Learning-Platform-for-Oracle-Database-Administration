import type { Item } from "../types";
import { lesson } from "./build.js";

const L = "Lecture 2 · Oracle architecture";
export const l02: Item[] = [
  lesson(L, "Instance vs database", "Memory and processes on one side, files on the other", "CORE", 2,
    [["u", "l", "Users", "apps"], ["sga", "c", "SGA", "shared memory"], ["bg", "s", "Background", "DBWn LGWR SMON"], ["df", "d", "Data files", "tables, indexes"], ["rl", "f", "Redo logs", "every change"]],
    [
      ["Two halves", "Oracle is split in two. The instance lives in memory. The database is a set of files on disk.", "Stop the instance and the files are still safe on disk.", "sga bg df rl"],
      ["The instance", "The SGA is shared memory. Background processes such as DBWn and LGWR do the work behind the scenes.", "Instance = SGA + background processes.", "", "bg>sga", "INTERNAL", "Background work"],
      ["The database", "Data files hold your tables. Redo log files record every change so nothing is lost.", "Database = files on disk.", "", "bg>rl", "WRITE", "Redo write"],
      ["A user asks", "A user query reaches the SGA first. If the data is not cached, Oracle reads it from the data files.", "Memory first, disk only when needed.", "u", "u>sga>df>sga>u", "SQL", "Query"],
    ], { e: [["u", "sga"], ["sga", "df"], ["bg", "df"], ["bg", "rl"]] }),

  lesson(L, "Memory: SGA and PGA", "Shared memory and private memory", "CORE", 2,
    [["sga", "c", "SGA", "shared memory"], ["bc", "c", "Buffer cache", "data blocks"], ["rb", "c", "Redo buffer", "recent changes"], ["sp", "c", "Shared pool", "library + dictionary"], ["pga", "s", "PGA", "private per process"]],
    [
      ["SGA", "The System Global Area is memory shared by all sessions. It holds the database buffer cache, the redo log buffer, the shared pool and other pools.", "SGA = shared memory of the instance.", "sga"],
      ["Buffer cache", "Data blocks read from the data files are kept here, so repeat reads avoid the disk. Changed (dirty) blocks wait here until DBWn writes them.", "Cache hits are fast, disk reads are slow.", "bc", "sga>bc", "CACHE", "Cache lookup"],
      ["Redo log buffer", "Every change is first described in the redo log buffer. LGWR writes it to the online redo log files.", "Redo buffer is written at commit.", "rb", "bc>rb", "REDO", "Change record"],
      ["Shared pool", "The library cache keeps parsed SQL so it can be shared, and the data dictionary cache keeps definitions of tables and users. A server result cache is also here.", "Shared SQL means less parsing.", "sp", "sga>sp", "PARSE", "Shared SQL"],
      ["PGA", "The Program Global Area is private to one server process. It holds SQL work areas, session memory and the private SQL area.", "SGA is shared, PGA is private.", "pga", "pga>sga", "SQL", "SQL work area"],
    ], { hub: true }),

  lesson(L, "Background processes", "Who does what inside the instance", "CORE", 2,
    [["dbw", "s", "DBWn", "writes dirty buffers"], ["df", "d", "Data files", "tables, indexes"], ["ck", "s", "CKPT", "checkpoints"], ["lg", "s", "LGWR", "writes redo"], ["rl", "f", "Redo logs", "online files"], ["sm", "s", "SMON", "instance recovery"], ["pm", "s", "PMON", "cleans failed sessions"], ["ar", "s", "ARCn", "archives redo logs"]],
    [
      ["DBWn", "The database writer copies dirty blocks from the buffer cache to the data files when it is efficient to do so.", "Data files are written lazily.", "dbw df", "dbw>df", "WRITE", "Dirty blocks"],
      ["LGWR", "The log writer writes the redo log buffer to the online redo log files, for example at every commit.", "Commit = LGWR has written redo.", "lg rl", "lg>rl", "REDO", "Redo write"],
      ["CKPT", "At a checkpoint, CKPT updates the data file headers and the control files so recovery knows where to start.", "Checkpoints shorten recovery.", "ck", "ck>df", "CHECKPOINT", "Checkpoint"],
      ["SMON and PMON", "SMON performs instance recovery at startup. PMON cleans up after processes that fail and releases their resources.", "SMON repairs the instance, PMON cleans up sessions.", "sm pm", "sm>rl", "RECOVER", "Instance recovery"],
      ["ARCn", "In ARCHIVELOG mode the archiver copies filled redo log groups to the archive destination.", "Needed for recovery and standby databases.", "ar", "rl>ar", "ARCHIVE", "Archive copy"],
    ], { e: [["dbw", "df"], ["ck", "df"], ["lg", "rl"], ["sm", "rl"], ["ar", "rl"]] }),

  lesson(L, "Logical storage", "Tablespace, segment, extent and block", "CORE", 2,
    [["ts", "d", "Tablespace", "logical container"], ["sg", "f", "Segment", "one table or index"], ["ex", "f", "Extent", "contiguous blocks"], ["bk", "c", "Data block", "smallest I/O unit"]],
    [
      ["Tablespace", "A tablespace is a logical container for related segments. It is stored in one or more data files, and a data file belongs to only one tablespace.", "SYSTEM, SYSAUX, UNDO and TEMP are core tablespaces.", "ts"],
      ["Segment", "A segment holds all the extents of one structure, such as a table or an index.", "One table = one segment.", "sg", "ts>sg", "ALLOC", "Segment"],
      ["Extent", "An extent is a set of contiguous Oracle blocks given to a segment.", "Segments grow by extents.", "ex", "sg>ex", "ALLOC", "Extent"],
      ["Data block", "The data block is the smallest unit of I/O and space management. DB_BLOCK_SIZE sets the default size when the database is created.", "A bigger block size does not automatically mean faster.", "bk", "ex>bk", "I/O", "Data block"],
    ]),
];