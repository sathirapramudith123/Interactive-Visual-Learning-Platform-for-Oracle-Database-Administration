import type { Item } from "../types";
import { lesson } from "./build";

const L = "Administrator's Guide";
export const guide: Item[] = [
  lesson(L, "Admin accounts", "SYS, SYSTEM and the separation of duties", "SECURITY", 12,
    [["sys", "d", "SYS", "data dictionary"], ["sm", "s", "SYSTEM", "DBA role"], ["bk", "k", "SYSBACKUP", "RMAN backups"], ["dg", "s", "SYSDG", "Data Guard"], ["km", "h", "SYSKM", "TDE keystore"]],
    [
      ["SYS", "Created with the database and given all privileges. It owns the base tables and views of the data dictionary, so nobody should modify them or create tables in the SYS schema.", "Normal users should never connect as SYS.", "sys"],
      ["SYSTEM", "Also created automatically and granted the DBA role. It holds extra tables and views with administrative information. Never store tables for ordinary users in it.", "SYSTEM is for administration only.", "sm"],
      ["Separation of duties", "SYSBACKUP runs RMAN backup and recovery, SYSDG runs Data Guard operations, and SYSKM manages the Transparent Data Encryption keystore.", "One powerful account is split into smaller jobs.", "bk dg km"],
    ], { e: [] }),

  lesson(L, "DBA authentication", "OS authentication and the password file", "SECURITY", 12,
    [["dba", "l", "DBA", "you", 110, 300], ["os", "h", "OS authentication", "OSDBA group", 420, 170], ["pw", "f", "Password file", "made by ORAPWD", 420, 430], ["db", "d", "Database", "SYSDBA session", 730, 300]],
    [
      ["Who may use SYSDBA?", "Administrative privileges such as SYSDBA allow powerful operations, even when the database is not open. So the way a DBA proves who they are must be more secure than normal login.", "Two methods: operating system or password file.", "dba db"],
      ["Local: OS authentication", "The operating system identifies you. If your OS account is in the right OS group (such as OSDBA), you connect with: connect / as sysdba", "No password is checked by Oracle.", "os", "dba>os>db", "SYSDBA", "OS login"],
      ["Remote: password file", "For remote connections Oracle checks the password file. You create it with the ORAPWD utility, and it holds the passwords of users granted administrative privileges.", "Password file = secure remote DBA login.", "pw", "dba>pw>db", "SYSDBA", "Password check"],
    ], { e: [["dba", "os"], ["dba", "pw"], ["os", "db"], ["pw", "db"]] }),

  lesson(L, "Control files", "The small file that records the database structure", "CORE", 12,
    [["inst", "c", "Instance", "reads CONTROL_FILES", 110, 300], ["c1", "f", "Control file 1", "disk A", 420, 170], ["c2", "f", "Control file 2", "disk B", 420, 430], ["db", "d", "Data + redo files", "names, locations", 730, 300]],
    [
      ["What it holds", "The control file is a small binary file. It records the database name, the names and locations of the data files and redo log files, the creation time, the current log sequence number and checkpoint information.", "Without it the database cannot be mounted.", "c1"],
      ["Read at startup", "The CONTROL_FILES parameter lists the control files. The instance opens all of them at startup and writes to all of them while the database runs.", "This is what happens at MOUNT.", "inst c2", "inst>c1>inst>c2", "MOUNT", "Open control files"],
      ["Multiplex them", "Keep at least two control files, each on a different physical disk. If one disk fails, the other copy survives.", "Two or more copies on different disks.", ""],
      ["Find the files", "The control file tells Oracle where every data file and redo log is, so it can open them at OPEN.", "Control file = map of the database.", "db", "c1>db", "OPEN", "File locations"],
      ["Back it up", "Back up the control file initially and every time you change the physical structure of the database. Its size depends on limits such as MAXDATAFILES and MAXLOGFILES set in CREATE DATABASE.", "Back up after every structure change.", ""],
    ], { e: [["inst", "c1"], ["inst", "c2"], ["c1", "db"], ["c2", "db"]] }),

  lesson(L, "The redo log", "How LGWR writes redo in a circle", "CORE", 12,
    [["rb", "c", "Redo log buffer", "in the SGA", 110, 300], ["lg", "s", "LGWR", "log writer", 340, 300], ["l1", "f", "Redo log 1", "file", 600, 140], ["l2", "f", "Redo log 2", "file", 600, 300], ["l3", "f", "Redo log 3", "file", 600, 460]],
    [
      ["Redo records", "Each change creates a redo record made of change vectors. One salary update records changes to the table block, the undo block and the undo transaction table. Records collect in the redo log buffer.", "Redo can rebuild every change, including undo.", "rb"],
      ["Commit", "On COMMIT, LGWR writes the redo records to a redo log file and assigns an SCN. The user is told the commit worked only when all the redo is safely on disk. LGWR also flushes when the buffer fills, even before commit.", "Commit means the redo is on disk.", "lg l1", "rb>lg>l1", "REDO", "Commit"],
      ["Circular writing", "When the current log file fills, LGWR moves to the next one.", "LGWR fills the files one after another.", "l2", "lg>l2", "REDO", "Log switch"],
      ["Wrap around", "After the last file, LGWR goes back to the first one and starts the cycle again.", "Old redo is overwritten when it is no longer needed.", "l3", "lg>l3>lg>l1", "REDO", "Wrap around"],
      ["When can a file be reused?", "In NOARCHIVELOG mode, once its changes are written to the data files. In ARCHIVELOG mode, also after it has been archived. Oracle needs at least two files so one can be written while the other is archived.", "Minimum two redo log files.", ""],
    ], { e: [["rb", "lg"], ["lg", "l1"], ["lg", "l2"], ["lg", "l3"]] }),

  lesson(L, "Archiving redo logs", "ARCHIVELOG vs NOARCHIVELOG", "CORE", 12,
    [["lg", "s", "LGWR", "writes redo"], ["ol", "f", "Online log", "filled group"], ["ac", "s", "ARCn", "archiver"], ["ad", "d", "Archive dest", "archived logs"]],
    [
      ["NOARCHIVELOG", "A filled log is reused after its changes reach the data files. The old redo is gone, so you can only restore to your last backup.", "Simple, but data can be lost.", "lg ol"],
      ["ARCHIVELOG", "The archiver process ARCn copies each filled group to the archive destination. Choose this mode if you cannot afford to lose data after a disk failure.", "Every redo log is saved.", "ac ad", "ol>ac>ad", "ARCHIVE", "Archive copy"],
      ["LGWR must wait", "LGWR cannot overwrite a redo log group until it has been archived. Oracle starts more archiver processes if archiving falls behind.", "Slow archiving can stall the database.", ""],
      ["Why archive?", "Archived redo logs are used to recover a database, to update a standby database, and to study history with LogMiner.", "Needed for Data Guard and point-in-time recovery.", ""],
      ["Turn it on", "Back up, then STARTUP MOUNT (the database must be mounted but not open), ALTER DATABASE ARCHIVELOG, ALTER DATABASE OPEN. Then take a new full backup, because older backups no longer fit.", "Mounted but not open.", ""],
    ]),

  lesson(L, "Tablespaces", "Why a database uses several tablespaces", "CORE", 12,
    [["sys", "d", "SYSTEM", "data dictionary"], ["sx", "d", "SYSAUX", "auxiliary data"], ["un", "d", "UNDOTBS1", "undo data"], ["tp", "d", "TEMP", "temporary work"], ["us", "d", "USERS", "application data"]],
    [
      ["Use multiple tablespaces", "Separate user data from dictionary data, keep applications apart, put files on different disks, take one tablespace offline while others stay online, and back up tablespaces one by one.", "More flexibility and better availability.", "sys us"],
      ["Typical tablespaces", "SYSTEM holds the data dictionary, SYSAUX holds auxiliary data, an undo tablespace holds undo, TEMP holds temporary segments, and USERS or other tablespaces hold application data.", "Each tablespace has its own job.", "sx un tp"],
      ["Quotas", "A user who creates tables and indexes needs the privilege to create them and a quota (space limit) in the tablespace that will hold them.", "No quota, no space.", ""],
      ["Offline and read-only", "A tablespace can be taken offline for maintenance, or made read-only so its data cannot change.", "The rest of the database stays available.", ""],
      ["Kinds of tablespaces", "The guide covers locally managed, bigfile, temporary and encrypted tablespaces, and tablespaces with default compression.", "Locally managed is the normal choice today.", ""],
    ], { e: [] }),

  lesson(L, "Undo", "Rollback, read consistency and flashback", "CORE", 12,
    [["un", "d", "Undo", "before image"], ["up", "l", "UPDATE", "before commit"], ["rb", "s", "ROLLBACK", "undo changes"], ["rc", "c", "Read consistency", "old data for readers"], ["fb", "c", "Flashback", "as of earlier time"]],
    [
      ["Undo records", "Before a change is committed, Oracle stores the old values as undo records.", "Undo = how to reverse a change.", "un up", "up>un", "UNDO", "Before image"],
      ["Rollback", "When you issue ROLLBACK, the undo records are used to undo the uncommitted changes.", "ROLLBACK reads undo.", "rb", "un>rb", "ROLLBACK", "Undo changes"],
      ["Recovery", "During database recovery, undo removes any uncommitted changes that were applied from the redo log to the data files.", "Roll forward with redo, roll back with undo.", ""],
      ["Read consistency", "While one user changes data, other users reading the same rows still see the before image kept as undo.", "Readers do not wait for writers.", "rc", "un>rc", "READ", "Old version"],
      ["Flashback", "Undo lets you look at data as of an earlier time with Flashback Query and recover from logical mistakes.", "Query the past.", "fb", "un>fb", "FLASHBACK", "As of earlier"],
      ["Automatic undo management", "This is the default. DBCA creates an auto-extending undo tablespace named UNDOTBS1, and UNDO_TABLESPACE chooses which one is used. The undo retention period is the minimum time Oracle tries to keep old undo. Without an undo tablespace, undo goes into SYSTEM, which is not recommended.", "Keep an undo tablespace.", ""],
    ], { hub: true }),

  lesson(L, "Users and privileges", "What you define when you create a user", "SECURITY", 12,
    [["us", "l", "User", "user name"], ["au", "h", "Authentication", "password or other"], ["ts", "d", "Tablespaces", "default, temp, quota"], ["pr", "s", "Profile", "resource limits"], ["ro", "h", "Privileges", "system, object, roles"]],
    [
      ["A user account", "When you create a user you give a user name, an authentication method, a default tablespace, a temporary tablespace, other tablespaces with quotas, and a profile.", "The account is stored in the data dictionary.", "us"],
      ["Authentication", "Oracle must know how this user proves who they are before any connection is allowed.", "Valid user name first.", "au", "us>au", "AUTH", "Login"],
      ["Where data goes", "The default tablespace holds the user's objects, the temporary tablespace holds sort work, and quotas limit the space used.", "Default, temporary and quota.", "ts", "us>ts", "QUOTA", "Space quota"],
      ["Privileges and roles", "A system privilege allows an operation, an object privilege controls one specific object, and a role is a collection of privileges and other roles.", "Grant only what is needed.", "ro pr", "us>ro", "GRANT", "Privilege"],
    ], { hub: true }),
];