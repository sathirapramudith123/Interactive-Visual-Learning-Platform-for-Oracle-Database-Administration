import type { Item } from "../types";
import { lesson } from "./build";

const L = "Lecture 4 · Managing the instance";
export const l04: Item[] = [
  lesson(L, "Startup stages", "NOMOUNT, MOUNT and OPEN", "CORE", 4,
    [["sd", "d", "SHUTDOWN", "instance off"], ["nm", "c", "NOMOUNT", "spfile read"], ["mt", "f", "MOUNT", "control files"], ["op", "d", "OPEN", "data files"]],
    [
      ["Instance is off", "Nothing is running. The database files sit on disk.", "Start with STARTUP.", "sd"],
      ["NOMOUNT", "Oracle reads the spfile (or pfile), allocates the SGA and starts the background processes. No database is attached yet.", "Instance started, database not attached.", "nm", "sd>nm", "STARTUP"],
      ["MOUNT", "Oracle opens the control files and reads them to find the data files and redo logs.", "Control files = map of the database.", "mt", "nm>mt", "MOUNT"],
      ["OPEN", "Oracle opens the data files, the undo tablespace and the redo logs. Users can now work.", "OPEN = normal operation.", "op", "mt>op", "OPEN"],
    ]),

  lesson(L, "Shutdown modes", "Clean and dirty shutdowns", "CORE", 4,
    [["op", "d", "Running", "database open", 120, 300], ["cl", "s", "Clean shutdown", "NORMAL TRANS IMMED", 430, 170], ["dr", "c", "Dirty shutdown", "ABORT", 430, 430], ["nx", "s", "Next startup", "what happens", 740, 300]],
    [
      ["Clean modes", "NORMAL, TRANSACTIONAL and IMMEDIATE all end with a consistent database. IMMEDIATE rolls back uncommitted work and disconnects users right away.", "Three clean ways to stop.", "op cl", "op>cl", "SHUTDOWN"],
      ["After a clean shutdown", "The buffer cache is written to the data files and resources are released. The next startup needs no instance recovery.", "Clean = no recovery.", "nx", "cl>nx", "STARTUP"],
      ["ABORT", "Modified buffers are not written and uncommitted changes are not rolled back. Instance failure and STARTUP FORCE leave the same dirty state.", "Dirty = inconsistent database.", "dr", "op>dr", "ABORT"],
      ["After ABORT", "On the next startup the online redo logs reapply changes and the undo segments roll back uncommitted work.", "Dirty = instance recovery.", "", "dr>nx", "RECOVER"],
      ["Which to use?", "IMMEDIATE is the normal everyday choice. Keep ABORT for emergencies, when other modes cannot work.", "A-T-I-N: only ABORT needs recovery.", ""],
    ], { e: [["op", "cl"], ["op", "dr"], ["cl", "nx"], ["dr", "nx"]] }),

  lesson(L, "Commit and crash recovery", "Why committed data survives a crash", "CORE", 4,
    [["u", "l", "User", "UPDATE + COMMIT", 110, 300], ["bf", "c", "Buffer cache", "in memory", 330, 300], ["rl", "f", "Redo log", "on disk", 580, 160], ["df", "d", "Data file", "on disk", 580, 440], ["sm", "s", "SMON", "recovery", 810, 300]],
    [
      ["Change in memory", "An UPDATE changes the block in the buffer cache. The data file is not touched yet.", "Changes happen in memory first.", "u bf", "u>bf", "SQL", "UPDATE"],
      ["Commit writes redo", "On COMMIT, LGWR writes the redo records to the online redo log on disk.", "Redo on disk makes a commit safe.", "rl", "bf>rl", "REDO", "COMMIT"],
      ["User is told", "Oracle tells the user the commit succeeded. The data file may still be old, and that is fine.", "Commit does not wait for the data file.", "", "rl>u", "ACK", "Committed", "res"],
      ["Data file, later", "DBWn writes dirty buffers to the data file when efficient, for example at a checkpoint.", "CKPT limits how much redo must be replayed.", "df", "bf>df", "WRITE", "Checkpoint"],
      ["Crash", "The instance dies. The buffer cache is lost, so the data file may miss committed changes.", "Memory is gone, redo log is not.", "sm"],
      ["Instance recovery", "On restart SMON rolls forward by replaying redo, then rolls back uncommitted work using undo.", "Roll forward, then roll back.", "", "rl>sm>df", "RECOVER", "Roll forward"],
    ], { e: [["u", "bf"], ["bf", "rl"], ["bf", "df"], ["rl", "sm"], ["sm", "df"]] }),
];