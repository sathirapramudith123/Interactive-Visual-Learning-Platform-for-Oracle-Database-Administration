import type { Item } from "../types";
import { lesson } from "./build.js";

const L = "Lecture 11 · Logs and recovery";
export const l11: Item[] = [
  lesson(L, "Recovery models", "WAL, recovery models, log shipping", "CORE", 11,
    [["wl", "f", "Write-ahead log", "log first"], ["sm", "c", "Simple", "no log backup"], ["fl", "d", "Full", "point of failure"], ["bl", "k", "Bulk-logged", "fast bulk load"], ["ls", "s", "Log shipping", "warm standby"]],
    [
      ["Write-ahead logging", "Every transaction is written to the sequential log first. A checkpoint later writes to the data file.", "Log first, data later.", "wl"],
      ["Simple model", "Log space is reused once changes reach the data file. You can restore only to the last full or differential backup.", "Least work, most data loss risk.", "sm", "wl>sm", "LOG", "Reuse log space"],
      ["Full model", "Everything is fully logged, so you can restore to the point of failure. It needs log backups and more disk space.", "Full + log backups = unbroken log chain.", "fl", "sm>fl", "LOG", "Full logging"],
      ["Bulk-logged", "Like full, but bulk operations such as BULK INSERT and CREATE INDEX are minimally logged, so they run fast.", "Fast loads, weaker point-in-time recovery.", "bl", "fl>bl", "BULK", "Bulk load"],
      ["Log shipping", "Three jobs keep a warm standby: backup the log on the primary, copy it to the standby, restore it there. Mirroring (full model only) can be synchronous or asynchronous.", "Backup, copy, restore.", "ls", "bl>ls", "SHIP", "Ship the log"],
    ]),

  lesson(L, "Backup types", "Full, differential and log backups", "CORE", 11,
    [["fu", "k", "Full backup", "all data + log"], ["di", "k", "Differential", "changes since full"], ["lg", "f", "Log backup", "transaction log"], ["re", "l", "Restore", "in the right order"]],
    [
      ["Full backup", "Copies all the data plus enough log to recover. It is the starting point of every restore.", "Everything, once in a while.", "fu"],
      ["Differential backup", "Copies only what changed since the last full backup. To restore, apply the full backup first and then only the latest differential.", "Smaller and faster than a full backup.", "di", "fu>di", "BACKUP", "Differential"],
      ["Log backup", "Required under the full and bulk-logged models. An unbroken sequence of log backups forms the log chain and allows restore to a point in time.", "Break the chain and you lose point-in-time recovery.", "lg", "di>lg", "BACKUP", "Log backup"],
      ["Restore order", "Restore the full backup, then the latest differential, then the log backups in order, up to the point you want.", "Full, differential, logs.", "re", "fu>di>lg>re", "RESTORE", "Restore", "bak"],
    ]),
];