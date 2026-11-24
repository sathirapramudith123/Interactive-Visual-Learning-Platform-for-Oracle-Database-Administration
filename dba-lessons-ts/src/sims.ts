// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type S = Record<string, any>;
export interface R { t: string; e?: boolean; m?: string[]; lit?: string[] }
export interface Act { l: string; f: (s: S) => R }
export interface Sim { goal: string; init: S; hud: (s: S) => string; acts: Act[] }

const ok = (t: string, m?: string[]): R => ({ t, m });
const er = (t: string, m?: string[]): R => ({ t, e: true, m });
const li = (t: string, lit: string[]): R => ({ t, lit });
const yn = (b: unknown): string => (b ? "yes" : "no");
// one step of an ordered procedure: step n needs step n-1 first
const stp = (l: string, n: number, why: string, done: string, ids: string[]): Act => ({
  l,
  f: s => {
    if (s.step >= n) return ok("Already done.");
    if (s.step < n - 1) return er(why, ids);
    s.step = n;
    return ok(done, ids);
  },
});

type V = [number, number];
const VEC: Record<string, V> = { dog: [0.9, 0.1], cat: [0.85, 0.15], car: [0.1, 0.9], truck: [0.15, 0.85] };
const cos = (a: V, b: V): number => (a[0] * b[0] + a[1] * b[1]) / (Math.hypot(a[0], a[1]) * Math.hypot(b[0], b[1]));
const near = (q: V): string =>
  Object.keys(VEC).map(k => [k, cos(q, VEC[k])] as [string, number])
    .sort((x, y) => y[1] - x[1]).slice(0, 2).map(x => `${x[0]} (${x[1].toFixed(2)})`).join(", ");

export const SIMS: Record<string, Sim> = {
"What a DBA does": {
 goal: "Try to read data before and after access is granted. Then lose the disk with and without a backup.",
 init: { bk: false, gr: false, lost: false },
 hud: s => `Backup: ${yn(s.bk)} | Access granted: ${yn(s.gr)} | Data: ${s.lost ? "LOST" : "OK"}`,
 acts: [
  { l: "User reads data", f: s => !s.gr ? er("ORA-00942: table or view does not exist. The DBA has not granted access yet.", ["u", "sec"]) : s.lost ? er("The data is gone. Restore it first.", ["u", "db"]) : ok("Query returned rows.", ["u", "db"]) },
  { l: "DBA grants access", f: s => { s.gr = true; return ok("GRANT done. Security now lets the user in.", ["dba", "sec", "u"]); } },
  { l: "DBA takes a backup", f: s => { s.bk = true; return ok("Backup stored safely.", ["db", "bk"]); } },
  { l: "Disk fails", f: s => { s.lost = true; return er("Disk failure! The database files are lost.", ["db"]); } },
  { l: "DBA restores", f: s => {
    if (!s.lost) return ok("Nothing to restore.");
    if (!s.bk) return er("No backup exists. The data cannot be recovered.", ["bk", "db"]);
    s.lost = false; return ok("Restored from backup.", ["bk", "db"]);
  } },
 ]},
"Instance vs database": {
 goal: "Start and stop the instance and watch what stays on disk. Run a query twice to see the cache.",
 init: { up: false, hot: false },
 hud: s => `Instance: ${s.up ? "ON" : "OFF"} | Data cached in SGA: ${yn(s.hot)}`,
 acts: [
  { l: "Start instance", f: s => { if (s.up) return ok("Already running."); s.up = true; return ok("SGA allocated and background processes started.", ["bg", "sga"]); } },
  { l: "User query", f: s => {
    if (!s.up) return er("ORA-01034: ORACLE not available", ["u", "sga"]);
    if (s.hot) return ok("Cache hit: answered from memory.", ["u", "sga"]);
    s.hot = true; return ok("Not cached: read from the data files into the SGA.", ["u", "sga", "df", "sga"]);
  } },
  { l: "Stop instance", f: s => { s.up = false; s.hot = false; return li("Instance gone. The data files and redo logs are still safe on disk.", ["df", "rl"]); } },
 ]},
"Memory: SGA and PGA": {
 goal: "Run the same SQL twice, read the same row twice, then change a row and commit.",
 init: { pool: false, blk: false, dirty: false },
 hud: s => `SQL in shared pool: ${yn(s.pool)} | Block in cache: ${yn(s.blk)} | Dirty block: ${yn(s.dirty)}`,
 acts: [
  { l: "Run a SQL statement", f: s => { if (s.pool) return ok("Soft parse: the shared pool already has this SQL.", ["pga", "sp"]); s.pool = true; return ok("Hard parse: SQL parsed and stored in the shared pool.", ["pga", "sp"]); } },
  { l: "Read a row", f: s => { if (s.blk) return ok("Buffer cache hit. No disk read.", ["pga", "bc"]); s.blk = true; return ok("Block not cached: read from disk into the buffer cache.", ["pga", "bc"]); } },
  { l: "Change a row", f: s => { s.blk = true; s.dirty = true; return ok("Block changed in the buffer cache and the change recorded in the redo log buffer.", ["bc", "rb"]); } },
  { l: "COMMIT", f: s => s.dirty ? li("LGWR writes the redo log buffer to disk. The dirty block waits in cache for DBWn.", ["rb"]) : ok("Nothing to commit.") },
  { l: "DBWn writes dirty blocks", f: s => { if (!s.dirty) return ok("No dirty blocks."); s.dirty = false; return li("Dirty block written to the data file.", ["bc"]); } },
 ]},
"Background processes": {
 goal: "Make changes, commit, run a checkpoint and then crash the instance. Watch the counters.",
 init: { d: 0, r: 0, c: 0 },
 hud: s => `Dirty buffers: ${s.d} | Redo waiting: ${s.r} | Checkpoints: ${s.c}`,
 acts: [
  { l: "Users change data", f: s => { s.d += 3; s.r += 3; return li("3 changes: dirty buffers in the cache and redo in the log buffer.", ["dbw", "lg"]); } },
  { l: "COMMIT (LGWR)", f: s => { if (!s.r) return ok("No redo waiting."); s.r = 0; return li("LGWR wrote the redo to the online redo log.", ["lg"]); } },
  { l: "DBWn writes buffers", f: s => { if (!s.d) return ok("No dirty buffers."); s.d = 0; return li("DBWn wrote the dirty buffers to the data files.", ["dbw"]); } },
  { l: "Checkpoint (CKPT)", f: s => { s.d = 0; s.c += 1; return ok("CKPT made DBWn write all dirty buffers and updated the file headers and control file.", ["ck", "dbw"]); } },
  { l: "A session crashes", f: () => li("PMON rolls back the failed session and releases its resources.", ["pm"]) },
  { l: "Instance crash", f: s => { const t = s.d > 0 || s.r > 0; s.d = 0; s.r = 0; return li(t ? "Crash with unsaved work. At restart SMON rolls forward from the redo log." : "Crash with nothing pending. Recovery is quick.", ["sm"]); } },
  { l: "Redo log full (ARCn)", f: () => li("In ARCHIVELOG mode ARCn copies the filled redo log group to the archive destination.", ["ar"]) },
 ]},
"Logical storage": {
 goal: "Create a tablespace, a table and insert rows until a new extent is allocated.",
 init: { ts: false, seg: false, ext: 0 },
 hud: s => `Tablespace: ${yn(s.ts)} | Table segment: ${yn(s.seg)} | Extents: ${s.ext}`,
 acts: [
  { l: "CREATE TABLESPACE appdata", f: s => { s.ts = true; return li("Tablespace created (backed by a data file).", ["ts"]); } },
  { l: "CREATE TABLE in appdata", f: s => {
    if (!s.ts) return er("ORA-00959: tablespace 'APPDATA' does not exist", ["ts"]);
    s.seg = true; s.ext = 1; return ok("Segment created with its first extent.", ["ts", "sg", "ex"]);
  } },
  { l: "INSERT 10,000 rows", f: s => {
    if (!s.seg) return er("ORA-00942: table or view does not exist", ["sg"]);
    s.ext += 1; return ok("Segment full: a new extent of contiguous blocks was allocated.", ["sg", "ex", "bk"]);
  } },
  { l: "DROP TABLE", f: s => { if (!s.seg) return ok("No table."); s.seg = false; s.ext = 0; return li("Segment and extents freed back to the tablespace.", ["ts"]); } },
 ]},
"Installing Oracle": {
 goal: "Do the steps out of order to see the errors. Then do them in the right order.",
 init: { step: 0 },
 hud: s => `Steps done: ${s.step} of 5`,
 acts: [
  stp("1. Plan the database", 1, "", "Size, users, backup needs and performance decided.", ["pl"]),
  stp("2. Run the Preinstall RPM", 2, "Plan first: you must know the size, users and backup needs before preparing the server.", "OS packages, the oracle user and kernel settings are ready.", ["pl", "pr"]),
  stp("3. Install the 23ai RPM", 3, "The server is not prepared yet. Run the Preinstall RPM first.", "Oracle software installed. No database exists yet.", ["pr", "in"]),
  stp("4. Configure the database", 4, "The Oracle software is not installed yet.", "Database created.", ["in", "cf"]),
  stp("5. Set the oracle user environment", 5, "There is no database yet to point the environment at.", "ORACLE_SID, ORACLE_BASE, ORACLE_HOME and PATH are set.", ["cf", "ev"]),
  { l: "Try: sqlplus / as sysdba", f: s => s.step < 5 ? er("bash: sqlplus: command not found", ["ev"]) : ok("Connected to Oracle Database 23ai Free.", ["cf", "ev"]) },
 ]},
"Startup stages": {
 goal: "Open the database in the wrong order. Then delete the control file and try to mount.",
 init: { st: 0, cf: true },
 hud: s => `State: ${["SHUTDOWN", "NOMOUNT", "MOUNT", "OPEN"][s.st]} | Control file: ${s.cf ? "present" : "MISSING"}`,
 acts: [
  { l: "STARTUP NOMOUNT", f: s => { if (s.st !== 0) return er("ORA-01081: cannot start already-running ORACLE - shut it down first", ["nm"]); s.st = 1; return ok("Instance started: spfile read, SGA allocated, processes running.", ["sd", "nm"]); } },
  { l: "ALTER DATABASE MOUNT", f: s => {
    if (s.st === 0) return er("ORA-01034: ORACLE not available", ["sd"]);
    if (s.st >= 2) return er("ORA-01100: database already mounted", ["mt"]);
    if (!s.cf) return er("ORA-00205: error in identifying control file", ["nm", "mt"]);
    s.st = 2; return ok("Control files opened and read.", ["nm", "mt"]);
  } },
  { l: "ALTER DATABASE OPEN", f: s => {
    if (s.st === 0) return er("ORA-01034: ORACLE not available", ["sd"]);
    if (s.st === 1) return er("ORA-01507: database not mounted", ["nm"]);
    if (s.st === 3) return er("ORA-01531: a database already open by the instance", ["op"]);
    s.st = 3; return ok("Data files, undo and redo logs opened. Users can work.", ["mt", "op"]);
  } },
  { l: "SHUTDOWN IMMEDIATE", f: s => { if (s.st === 0) return ok("Already shut down."); s.st = 0; return ok("Database closed and dismounted. Instance shut down.", ["op", "sd"]); } },
  { l: "Delete the control file", f: s => { s.cf = false; return er("Control file removed (simulated disaster).", ["mt"]); } },
  { l: "Restore the control file", f: s => { s.cf = true; return li("Control file restored from backup.", ["mt"]); } },
 ]},
"Shutdown modes": {
 goal: "Compare IMMEDIATE and ABORT. After ABORT, start up again and read the recovery message.",
 init: { up: true, tx: true, dirty: false },
 hud: s => `Database: ${s.up ? "OPEN" : "DOWN"} | Uncommitted transaction: ${yn(s.tx)} | State: ${s.dirty ? "DIRTY" : "clean"}`,
 acts: [
  { l: "Open a transaction", f: s => { if (!s.up) return er("ORA-01034: ORACLE not available", ["op"]); s.tx = true; return li("A user starts a transaction and has not committed.", ["op"]); } },
  { l: "Disconnect the user", f: s => { s.tx = false; return li("The user disconnected.", ["op"]); } },
  { l: "SHUTDOWN NORMAL", f: s => {
    if (!s.up) return ok("Already down.");
    if (s.tx) return er("NORMAL waits until every user disconnects, so the command hangs. Disconnect the user first.", ["op"]);
    s.up = false; s.dirty = false; return ok("Clean shutdown. No recovery needed next time.", ["op", "cl", "nx"]);
  } },
  { l: "SHUTDOWN IMMEDIATE", f: s => { if (!s.up) return ok("Already down."); s.up = false; s.tx = false; s.dirty = false; return ok("Uncommitted work rolled back, buffers written. Clean shutdown.", ["op", "cl", "nx"]); } },
  { l: "SHUTDOWN ABORT", f: s => { if (!s.up) return ok("Already down."); s.up = false; s.dirty = true; return ok("Instance killed. Buffers not written and nothing rolled back: dirty database.", ["op", "dr", "nx"]); } },
  { l: "STARTUP", f: s => {
    if (s.up) return er("ORA-01081: cannot start already-running ORACLE - shut it down first", ["op"]);
    s.up = true; s.tx = false;
    if (s.dirty) { s.dirty = false; return ok("Instance recovery: redo rolled forward, then undo rolled back the uncommitted work.", ["dr", "nx"]); }
    return ok("Normal startup. No recovery needed.", ["cl", "nx"]);
  } },
 ]},
"Commit and crash recovery": {
 goal: "Crash after COMMIT but before the data file is written. Then try an uncommitted change that was written to the data file.",
 init: { chg: false, com: false, dbf: "old", crashed: false, redo: false },
 hud: s => `Data file row: ${s.dbf} | Redo on disk: ${yn(s.redo)} | Instance: ${s.crashed ? "CRASHED" : "running"}`,
 acts: [
  { l: "UPDATE the row", f: s => { if (s.crashed) return er("The instance is down. Restart it first.", ["bf"]); s.chg = true; s.com = false; return ok("Row changed in the buffer cache only.", ["u", "bf"]); } },
  { l: "COMMIT", f: s => {
    if (s.crashed) return er("The instance is down. Restart it first.", ["bf"]);
    if (!s.chg) return er("Nothing to commit.", ["u"]);
    s.com = true; s.redo = true; return ok("LGWR wrote the redo to disk. The user is told: committed.", ["bf", "rl", "u"]);
  } },
  { l: "DBWn writes the data file", f: s => {
    if (s.crashed) return er("The instance is down. Restart it first.", ["bf"]);
    if (!s.chg) return ok("Nothing changed.");
    s.dbf = "new"; return ok("Data file now holds the new value" + (s.com ? "." : " even though it is NOT committed yet!"), ["bf", "df"]);
  } },
  { l: "CRASH the instance", f: s => { s.crashed = true; return er("The instance died. Memory is lost.", ["bf"]); } },
  { l: "Restart (SMON recovery)", f: s => {
    if (!s.crashed) return er("The instance is already running.", ["sm"]);
    s.crashed = false;
    const keep = s.redo;
    s.dbf = keep ? "new" : "old"; s.chg = false; s.com = false; s.redo = false;
    return keep ? ok("Roll forward: the committed change was re-applied from the redo log. Data is safe.", ["rl", "sm", "df"])
                : ok("Roll back: the uncommitted change was removed using undo. The row is back to old.", ["sm", "df"]);
  } },
 ]},
"How a client connects": {
 goal: "Connect with the listener off, then with the database down, then with everything running.",
 init: { ln: false, inst: false, conn: false },
 hud: s => `Listener: ${s.ln ? "ON" : "OFF"} | Database: ${s.inst ? "UP" : "DOWN"} | Session: ${yn(s.conn)}`,
 acts: [
  { l: "Start listener", f: s => { s.ln = true; return li("Listening on port 1521.", ["l"]); } },
  { l: "Start database", f: s => { s.inst = true; return li("Database open and its service registered with the listener.", ["sp", "df"]); } },
  { l: "Connect with a wrong password", f: s => {
    if (!s.ln) return er("ORA-12541: TNS:no listener", ["c", "l"]);
    if (!s.inst) return er("ORA-12514: listener does not know of service requested", ["c", "l"]);
    return er("ORA-01017: invalid username/password; logon denied", ["c", "l", "sp"]);
  } },
  { l: "Connect hr/hr@sales", f: s => {
    if (!s.ln) return er("ORA-12541: TNS:no listener", ["c", "l"]);
    if (!s.inst) return er("ORA-12514: listener does not know of service requested", ["c", "l"]);
    s.conn = true; return ok("Connected. Now the client talks directly to its server process.", ["c", "l", "sp", "df"]);
  } },
  { l: "Stop listener", f: s => { s.ln = false; return li(s.conn ? "Existing sessions keep working. New clients cannot connect." : "Listener stopped.", ["l"]); } },
  { l: "Disconnect", f: s => { s.conn = false; return li("Session closed.", ["sp"]); } },
 ]},
"Naming methods": {
 goal: "Try the alias before and after adding it to tnsnames.ora. Then try failover with Easy Connect.",
 init: { f: false },
 hud: s => `'orcl' in tnsnames.ora: ${yn(s.f)}`,
 acts: [
  { l: "Easy Connect (host:1521/service)", f: () => li("Resolved with no configuration. TCP/IP only.", ["ez"]) },
  { l: "Connect with alias 'orcl'", f: s => s.f ? li("Alias found in tnsnames.ora and resolved.", ["lo"]) : er("ORA-12154: TNS:could not resolve the connect identifier specified", ["lo"]) },
  { l: "Add 'orcl' to tnsnames.ora", f: s => { s.f = true; return li("Entry added: host, port and service name.", ["lo"]); } },
  { l: "tnsping orcl", f: s => s.f ? li("OK (10 msec). The listener answered. This does not prove the service is available.", ["tp"]) : er("TNS-03505: Failed to resolve name", ["tp", "lo"]) },
  { l: "Ask Easy Connect for failover", f: () => er("Easy Connect has no connect-time failover or load balancing. Use local naming.", ["ez"]) },
  { l: "Use a central LDAP directory", f: () => li("Directory naming: one central server answers for many clients.", ["di"]) },
 ]},
"Database security": {
 goal: "Read salaries before login, before the grant, and after. Then steal the data file with and without encryption.",
 init: { auth: false, pr: false, enc: false, aud: false },
 hud: s => `Logged in: ${yn(s.auth)} | SELECT granted: ${yn(s.pr)} | Encryption: ${yn(s.enc)} | Auditing: ${yn(s.aud)}`,
 acts: [
  { l: "Log in with a wrong password", f: () => er("ORA-01017: invalid username/password; logon denied", ["u", "au"]) },
  { l: "Log in correctly", f: s => { s.auth = true; return ok("Authenticated.", ["u", "au"]); } },
  { l: "Read salaries", f: s => {
    if (!s.auth) return er("Not logged in.", ["u", "au"]);
    if (!s.pr) return er("ORA-00942: table or view does not exist", ["au", "ac"]);
    return s.aud ? ok("Rows returned and recorded in the audit trail.", ["au", "ac", "ad"]) : ok("Rows returned.", ["au", "ac"]);
  } },
  { l: "GRANT SELECT", f: s => { s.pr = true; return li("Privilege granted (least privilege: only SELECT).", ["ac"]); } },
  { l: "Turn on encryption (TDE)", f: s => { s.enc = true; return li("Data at rest is now encrypted.", ["en"]); } },
  { l: "Thief copies the data file", f: s => s.enc ? ok("The file is encrypted: the thief sees only unreadable data.", ["en"]) : er("The thief reads the salaries in plain text!", ["en"]) },
  { l: "Turn on auditing", f: s => { s.aud = true; return li("Auditing is on: access will be recorded.", ["ad"]); } },
 ]},
"Performance tuning": {
 goal: "Run the query with no index, add one, then load more rows and see what stale statistics do. Times are illustrative.",
 init: { idx: false, stale: false, last: "none yet" },
 hud: s => `Index: ${yn(s.idx)} | Statistics: ${s.stale ? "STALE" : "fresh"} | Last query: ${s.last}`,
 acts: [
  { l: "Run: WHERE id = 42 (1M rows)", f: s => {
    if (!s.idx) { s.last = "4.2 s (full scan)"; return ok("TABLE ACCESS FULL: every block was read. Illustrative time: 4.2 s.", ["q", "op", "pl", "ex"]); }
    if (s.stale) { s.last = "4.2 s (full scan)"; return er("Statistics are stale, so the optimizer may choose a poor plan: it still did a full scan.", ["op", "pl"]); }
    s.last = "10 ms (index)"; return ok("INDEX RANGE SCAN: went straight to the row. Illustrative time: 10 ms.", ["q", "op", "pl", "ex"]);
  } },
  { l: "CREATE INDEX on id", f: s => { s.idx = true; return li("B-tree index created.", ["pl"]); } },
  { l: "Load 1 million more rows", f: s => { s.stale = true; return li("The table changed a lot. Statistics no longer match it.", ["op"]); } },
  { l: "Gather statistics (DBMS_STATS)", f: s => { s.stale = false; return li("Fresh statistics collected.", ["op"]); } },
  { l: "Check AWR / ADDM", f: s => s.idx ? ok("No major findings for this SQL.", ["ex", "tu"]) : ok("AWR shows this SQL as top by elapsed time. ADDM recommends an index.", ["ex", "tu"]) },
 ]},
"High availability and DR": {
 goal: "Start Data Guard, commit, lose the primary and fail over. Then repeat in asynchronous mode to see the RPO.",
 init: { dg: false, as: false, n: 0, up: true },
 hud: s => `Data Guard: ${s.dg ? (s.as ? "async" : "sync") : "OFF"} | Commits: ${s.n} | Primary: ${s.up ? "UP" : "DOWN"}`,
 acts: [
  { l: "Start Data Guard (synchronous)", f: s => { s.dg = true; s.as = false; return ok("Redo is shipped to the standby before each commit returns.", ["p", "rl", "sb"]); } },
  { l: "Switch to asynchronous", f: s => { if (!s.dg) return er("Start Data Guard first.", ["rl"]); s.as = true; return li("The primary no longer waits for the standby: faster, but the last commits can be lost.", ["rl"]); } },
  { l: "Commit 5 transactions", f: s => {
    if (!s.up) return er("The primary is down.", ["p"]);
    s.n += 5;
    if (!s.dg) return li("Committed on the primary only.", ["p"]);
    return ok(s.as ? "Committed. Redo ships in the background." : "Committed on the primary and the standby.", ["p", "rl", "sb"]);
  } },
  { l: "DISASTER: primary lost", f: s => { s.up = false; return er("The primary site is lost!", ["p"]); } },
  { l: "Fail over to the standby", f: s => {
    if (s.up) return er("The primary is fine. Fail over only after a disaster.", ["sb"]);
    if (!s.dg) return er("No standby: restore from backup. Very long RTO and a large RPO.", ["fo"]);
    const lost = s.as ? Math.min(s.n, 2) : 0;
    s.n -= lost; s.up = true; s.dg = false;
    return ok(`Standby is the new primary. RPO: ${lost} transactions lost. RTO: seconds.`, ["sb", "fo"]);
  } },
 ]},
"Vector databases": {
 goal: "Search for 'puppy' with a keyword, then with vectors. The numbers are real cosine similarities of tiny 2-number vectors.",
 init: { st: false },
 hud: s => `Stored vectors: ${s.st ? "dog, cat, car, truck" : "none"}`,
 acts: [
  { l: "Embed and store dog, cat, car, truck", f: s => { s.st = true; return ok("Each word became a vector [animal, vehicle] and was stored with an index.", ["tx", "em", "vd"]); } },
  { l: "Keyword search: LIKE '%puppy%'", f: () => er("0 rows: the word 'puppy' is not stored, so keyword search finds nothing.", ["tx"]) },
  { l: "Vector search: 'puppy'", f: s => s.st ? ok("Nearest by cosine similarity: " + near([0.95, 0.12]), ["tx", "em", "vd", "sr", "rs"]) : er("The vector database is empty.", ["sr", "vd"]) },
  { l: "Vector search: 'bus'", f: s => s.st ? ok("Nearest by cosine similarity: " + near([0.12, 0.88]), ["tx", "em", "vd", "sr", "rs"]) : er("The vector database is empty.", ["sr", "vd"]) },
 ]},
"Transactions and CAP": {
 goal: "Crash a transfer with and without a transaction. Then cut the network and compare the CP and AP choices.",
 init: { a: 100, b: 100, part: false, cp: true, v1: 1, v2: 1 },
 hud: s => `A: ${s.a} | B: ${s.b} | Total: ${s.a + s.b} | Network: ${s.part ? "PARTITIONED" : "ok"} | Mode: ${s.cp ? "CP" : "AP"} | Node 1 v${s.v1}, Node 2 v${s.v2}`,
 acts: [
  { l: "Transfer 30 A to B (transaction)", f: s => { if (s.a < 30) return er("Not enough money in A.", ["t"]); s.a -= 30; s.b += 30; return ok("Both updates committed together. The total stays the same.", ["t", "ac"]); } },
  { l: "Crash mid-transfer (no transaction)", f: s => { if (s.a < 30) return er("Not enough money in A.", ["t"]); s.a -= 30; return er("The debit happened but the credit did not. 30 vanished: inconsistent!", ["t"]); } },
  { l: "Crash mid-transfer (in a transaction)", f: () => ok("Atomic: the whole transaction is rolled back. Balances are unchanged.", ["t", "ac"]) },
  { l: "Reset the money", f: s => { s.a = 100; s.b = 100; return li("Balances reset.", ["t"]); } },
  { l: "Toggle network partition", f: s => { s.part = !s.part; return li(s.part ? "The link between the two nodes is cut." : "The network is back.", ["cp"]); } },
  { l: "Switch CP / AP", f: s => { s.cp = !s.cp; return li(s.cp ? "Now CP: consistency over availability." : "Now AP: availability over consistency.", ["cp"]); } },
  { l: "Write on node 1", f: s => {
    if (s.part && s.cp) return er("CP: node 1 refuses the write to stay consistent. The service is not available.", ["cp"]);
    s.v1 += 1;
    if (s.part) return ok("AP: the write is accepted, but node 2 still has the old value (eventual consistency).", ["cp", "ns"]);
    s.v2 = s.v1; return li("Written and replicated to both nodes.", ["cp"]);
  } },
  { l: "Read on node 2", f: s => s.v2 !== s.v1 ? er(`Node 2 returns version ${s.v2}: a stale read.`, ["ns"]) : li(`Node 2 returns version ${s.v2}.`, ["ns"]) },
  { l: "Heal the network", f: s => { s.part = false; s.v2 = s.v1; return li("Partition healed: the replicas converge.", ["cp", "ns"]); } },
 ]},
"Recovery models": {
 goal: "Take backups and commit transactions in each model, then lose the server and count what is lost.",
 init: { m: "Full", n: 0, fb: 0, lb: 0, hf: false },
 hud: s => `Model: ${s.m} | Commits: ${s.n} | Full backup at: ${s.hf ? s.fb : "none"} | Last log backup at: ${s.hf ? s.lb : "none"}`,
 acts: [
  { l: "Set SIMPLE", f: s => { s.m = "Simple"; return li("Log space is reused after each checkpoint. No log backups.", ["sm"]); } },
  { l: "Set FULL", f: s => { s.m = "Full"; return li("Everything is fully logged. Log backups are possible.", ["fl"]); } },
  { l: "Set BULK-LOGGED", f: s => { s.m = "Bulk"; return li("Like FULL, but bulk operations are minimally logged.", ["bl"]); } },
  { l: "Commit 100 transactions", f: s => { s.n += 100; return li("100 transactions committed.", ["wl"]); } },
  { l: "Take a full backup", f: s => { s.fb = s.n; s.lb = s.n; s.hf = true; return li("Full backup taken. It is the base of every restore.", ["fl"]); } },
  { l: "Take a log backup", f: s => {
    if (s.m === "Simple") return er("The statement BACKUP LOG is not allowed while the recovery model is SIMPLE.", ["sm"]);
    if (!s.hf) return er("Take a full backup first.", ["fl"]);
    s.lb = s.n; return ok("Log backup saved. The log chain is unbroken.", ["fl", "ls"]);
  } },
  { l: "DISASTER: server lost", f: s => {
    if (!s.hf) return er("There is no backup at all. Everything is lost.", ["wl"]);
    const lost = s.m === "Simple" ? s.n - s.fb : s.n - s.lb;
    s.n -= lost; if (s.lb > s.n) s.lb = s.n; if (s.fb > s.n) s.fb = s.n;
    const id = s.m === "Simple" ? "sm" : s.m === "Full" ? "fl" : "bl";
    return lost > 0 ? er(`Restore finished. ${lost} committed transactions are lost.`, [id]) : ok("Restore finished. Nothing was lost.", [id]);
  } },
 ]},
"Backup types": {
 goal: "Let some days pass between backups, then restore and read the restore order.",
 init: { day: 0, fd: -1, dd: -1, logs: 0 },
 hud: s => `Day: ${s.day} | Full backup: ${s.fd < 0 ? "none" : "day " + s.fd} | Differential: ${s.dd < 0 ? "none" : "day " + s.dd} | Log backups since: ${s.logs}`,
 acts: [
  { l: "Next day (data changes)", f: s => { s.day += 1; return li(`It is day ${s.day}. More data has changed.`, ["fu"]); } },
  { l: "Full backup", f: s => { s.fd = s.day; s.dd = -1; s.logs = 0; return ok(`Full backup of everything (day ${s.day}).`, ["fu"]); } },
  { l: "Differential backup", f: s => {
    if (s.fd < 0) return er("No full backup yet: a differential needs a full base.", ["di", "fu"]);
    s.dd = s.day; s.logs = 0; return ok(`Differential: everything changed since the full (${s.day - s.fd} day(s) of changes).`, ["fu", "di"]);
  } },
  { l: "Log backup", f: s => { if (s.fd < 0) return er("No full backup yet.", ["lg"]); s.logs += 1; return ok(`Log backup number ${s.logs} saved.`, ["di", "lg"]); } },
  { l: "Restore", f: s => {
    if (s.fd < 0) return er("There is nothing to restore from.", ["re"]);
    const parts = [`full (day ${s.fd})`];
    if (s.dd >= 0) parts.push(`latest differential (day ${s.dd})`);
    if (s.logs > 0) parts.push(`${s.logs} log backup(s) in order`);
    return ok("Restore order: " + parts.join(" + ") + ".", ["fu", "di", "lg", "re"]);
  } },
 ]},
"Admin accounts": {
 goal: "Pick the right administrative account for each job.",
 init: {},
 hud: () => "Choose the right account for each job",
 acts: [
  { l: "RMAN backup as SYSBACKUP", f: () => li("SYSBACKUP exists for RMAN backup and recovery.", ["bk"]) },
  { l: "Data Guard switchover as SYSDG", f: () => li("SYSDG is for Data Guard operations.", ["dg"]) },
  { l: "Open the TDE keystore as SYSKM", f: () => li("SYSKM manages Transparent Data Encryption keystores.", ["km"]) },
  { l: "Create an app table in SYS", f: () => er("Don't: SYS owns the data dictionary. Nobody should create tables in its schema.", ["sys"]) },
  { l: "Store a user's table in SYSTEM", f: () => er("Don't: never use the SYSTEM schema for tables of non-administrative users.", ["sm"]) },
  { l: "Let normal users connect as SYS", f: () => er("Don't: SYS has every privilege. Most users must never connect with it.", ["sys"]) },
 ]},
"DBA authentication": {
 goal: "Try a local and a remote SYSDBA login before and after the setup.",
 init: { g: false, pw: false },
 hud: s => `OS user in OSDBA group: ${yn(s.g)} | Password file: ${yn(s.pw)}`,
 acts: [
  { l: "Connect / as sysdba (local)", f: s => s.g ? ok("Connected: the OS vouched for you. No password was checked.", ["dba", "os", "db"]) : er("ORA-01031: insufficient privileges", ["dba", "os"]) },
  { l: "Add the OS user to the OSDBA group", f: s => { s.g = true; return li("The OS user is now in the OSDBA group.", ["os"]); } },
  { l: "Create the password file (orapwd)", f: s => { s.pw = true; return li("Password file created.", ["pw"]); } },
  { l: "Connect sys@remote as sysdba", f: s => s.pw ? ok("Connected: Oracle checked the password file.", ["dba", "pw", "db"]) : er("ORA-01017: invalid username/password; logon denied", ["dba", "pw"]) },
 ]},
"Control files": {
 goal: "Delete one copy and try to start. Then delete both and see why backups of the control file matter.",
 init: { c1: true, c2: true, bk: false },
 hud: s => `Control file 1: ${s.c1 ? "ok" : "MISSING"} | Control file 2: ${s.c2 ? "ok" : "MISSING"} | Backup: ${yn(s.bk)}`,
 acts: [
  { l: "Start the database", f: s => {
    if (!s.c1 || !s.c2) return er("ORA-00205: error in identifying control file. Every listed copy must be present.", ["inst", !s.c1 ? "c1" : "c2"]);
    return ok("The instance opened both control files, then found the data and redo files.", ["inst", "c1", "db"]);
  } },
  { l: "Delete control file 1", f: s => { s.c1 = false; return er("Control file 1 deleted (disk A failed).", ["c1"]); } },
  { l: "Delete control file 2", f: s => { s.c2 = false; return er("Control file 2 deleted (disk B failed).", ["c2"]); } },
  { l: "Delete both copies", f: s => { s.c1 = false; s.c2 = false; return er("Both disks failed.", ["c1", "c2"]); } },
  { l: "Copy the surviving copy", f: s => {
    if (s.c1 && s.c2) return ok("Both copies already exist.");
    if (!s.c1 && !s.c2) return er("No copy survives. Restore from a backup of the control file.", ["inst"]);
    const src = s.c1 ? "c1" : "c2", dst = s.c1 ? "c2" : "c1";
    s.c1 = true; s.c2 = true; return ok("Copied from the good copy. Both files are back.", [src, dst]);
  } },
  { l: "Back up the control file", f: s => { s.bk = true; return li("Control file backed up. Do this after every structure change.", ["c1", "c2"]); } },
  { l: "Restore from the backup", f: s => {
    if (!s.bk) return er("There is no backup of the control file.", ["inst"]);
    s.c1 = true; s.c2 = true; return li("Both control files restored from the backup.", ["c1", "c2"]);
  } },
 ]},
"The redo log": {
 goal: "Fill the logs until they wrap around. Then turn ARCHIVELOG on and see LGWR wait for a log that is not archived.",
 init: { cur: 1, used: 0, arch: false, pend: [false, false, false], blk: false },
 hud: s => `Writing to log ${s.cur} | used ${s.used}% | ARCHIVELOG: ${yn(s.arch)} | waiting for archive: ${s.pend.map((p: boolean, i: number) => (p ? i + 1 : 0)).filter((x: number) => x).join(",") || "none"}`,
 acts: [
  { l: "Commit transactions (+40% of the log)", f: s => {
    const nx = (s.cur % 3) + 1;
    if (s.blk) return er(`LGWR is waiting: log ${nx} has not been archived yet. Let ARCn archive first.`, ["lg", "l" + nx]);
    s.used += 40;
    if (s.used < 100) return ok(`Redo written to log ${s.cur}.`, ["rb", "lg", "l" + s.cur]);
    if (s.arch && s.pend[nx - 1]) { s.used = 100; s.blk = true; return er(`Log ${s.cur} is full but log ${nx} is not archived yet: LGWR must wait.`, ["lg", "l" + nx]); }
    s.pend[s.cur - 1] = s.arch;
    const was = s.cur; s.cur = nx; s.used = 0;
    return ok(`Log ${was} is full. Log switch: LGWR moves to log ${nx}${nx === 1 ? " (wrap around)" : ""}.`, ["lg", "l" + nx]);
  } },
  { l: "Turn ARCHIVELOG on/off", f: s => {
    s.arch = !s.arch;
    if (!s.arch) { s.pend = [false, false, false]; if (s.blk) { s.blk = false; s.cur = (s.cur % 3) + 1; s.used = 0; } }
    return li(`ARCHIVELOG is now ${s.arch ? "ON" : "OFF"}.`, ["lg"]);
  } },
  { l: "ARCn archives the filled logs", f: s => {
    const had = s.pend.some((p: boolean) => p);
    s.pend = [false, false, false];
    if (s.blk) { s.blk = false; s.cur = (s.cur % 3) + 1; s.used = 0; return ok("Archived. LGWR can now switch to the next log.", ["lg", "l" + s.cur]); }
    return had ? li("Filled logs copied to the archive destination.", ["lg"]) : ok("Nothing waiting to be archived.");
  } },
 ]},
"Archiving redo logs": {
 goal: "Try to enable ARCHIVELOG while the database is open. Then do it the right way and compare a disk failure in each mode.",
 init: { st: "OPEN", arch: false, n: 0, ar: 0 },
 hud: s => `State: ${s.st} | Mode: ${s.arch ? "ARCHIVELOG" : "NOARCHIVELOG"} | Log switches: ${s.n} | Archived: ${s.ar}`,
 acts: [
  { l: "Switch the redo log", f: s => {
    if (s.st !== "OPEN") return er("The database is not open.", ["lg"]);
    s.n += 1;
    if (s.arch) { s.ar += 1; return ok("ARCn copied the filled log to the archive destination.", ["ol", "ac", "ad"]); }
    return ok("The filled log will be overwritten later: nothing is saved.", ["lg", "ol"]);
  } },
  { l: "ALTER DATABASE ARCHIVELOG", f: s => {
    if (s.st === "OPEN") return er("ORA-01126: database must be mounted in this instance and not open in any instance", ["ol"]);
    if (s.st === "DOWN") return er("ORA-01034: ORACLE not available", ["ol"]);
    s.arch = true; return ok("Archiving enabled (stored in the control file). Take a new backup now.", ["ol", "ac"]);
  } },
  { l: "SHUTDOWN, then STARTUP MOUNT", f: s => { s.st = "MOUNT"; return li("Mounted but not open: now the archiving mode can change.", ["ol"]); } },
  { l: "ALTER DATABASE OPEN", f: s => { if (s.st !== "MOUNT") return er("The database must be mounted first.", ["ol"]); s.st = "OPEN"; return li("Database open.", ["lg"]); } },
  { l: "Disk fails: restore", f: s => s.arch
    ? ok(`Restore the backup and apply ${s.ar} archived log(s): recovered up to the last commit.`, ["ad", "ol"])
    : er(`Only the last backup can be restored. The changes of ${s.n} log switch(es) are lost.`, ["ol"]) },
 ]},
"Tablespaces": {
 goal: "Create a table as app before it has a quota. Then take USERS offline and make it read-only.",
 init: { u: false, q: false, t: false, st: "ONLINE" },
 hud: s => `User app: ${yn(s.u)} | Quota on USERS: ${yn(s.q)} | Table: ${yn(s.t)} | USERS: ${s.st}`,
 acts: [
  { l: "CREATE USER app", f: s => { s.u = true; return li("User app created.", ["us"]); } },
  { l: "CREATE TABLE as app", f: s => {
    if (!s.u) return er("ORA-01918: user 'APP' does not exist", ["us"]);
    if (!s.q) return er("ORA-01950: no privileges on tablespace 'USERS'", ["us"]);
    s.t = true; return li("Table created in USERS.", ["us"]);
  } },
  { l: "Give app a quota on USERS", f: s => { if (!s.u) return er("ORA-01918: user 'APP' does not exist", ["us"]); s.q = true; return li("Quota granted.", ["us"]); } },
  { l: "INSERT a row", f: s => {
    if (!s.t) return er("ORA-00942: table or view does not exist", ["us"]);
    if (s.st === "READ ONLY") return er("ORA-01647: tablespace 'USERS' is read-only, cannot allocate space in it", ["us"]);
    if (s.st === "OFFLINE") return er("ORA-00376: file cannot be read at this time", ["us"]);
    return li("1 row created.", ["us"]);
  } },
  { l: "SELECT rows", f: s => {
    if (!s.t) return er("ORA-00942: table or view does not exist", ["us"]);
    if (s.st === "OFFLINE") return er("ORA-00376: file cannot be read at this time", ["us"]);
    return li("Rows returned.", ["us"]);
  } },
  { l: "Take USERS offline", f: s => { s.st = "OFFLINE"; return li("Only USERS is unavailable. SYSTEM, SYSAUX, UNDO and TEMP keep working.", ["us"]); } },
  { l: "Bring USERS online", f: s => { s.st = "ONLINE"; return li("USERS is online again.", ["us"]); } },
  { l: "Make USERS read-only", f: s => { s.st = "READ ONLY"; return li("Data in USERS can be read but not changed.", ["us"]); } },
  { l: "Make USERS read-write", f: s => { s.st = "ONLINE"; return li("USERS can be changed again.", ["us"]); } },
 ]},
"Undo": {
 goal: "Update without committing and read as another user. Roll back, then commit and use a flashback query.",
 init: { cm: 100, cur: 100, hist: [100], exp: false },
 hud: s => `Committed salary: ${s.cm} | Your session sees: ${s.cur} | Old versions kept: ${s.hist.length - 1}`,
 acts: [
  { l: "UPDATE salary = 200 (not committed)", f: s => { s.cur = 200; return ok("The old value is saved as undo. Your session sees 200.", ["up", "un"]); } },
  { l: "Another user SELECTs the salary", f: s => ok(`The other user still sees ${s.cm}: read consistency uses the before image.`, ["un", "rc"]) },
  { l: "ROLLBACK", f: s => { if (s.cur === s.cm) return ok("Nothing to roll back."); s.cur = s.cm; return ok("Undo restored the old value.", ["un", "rb"]); } },
  { l: "COMMIT", f: s => {
    if (s.cur === s.cm) return ok("Nothing to commit.");
    s.cm = s.cur; s.hist.push(s.cm); s.exp = false;
    return ok("Committed. The undo of the old value is kept for the retention period.", ["up", "un"]);
  } },
  { l: "Flashback query (earlier time)", f: s => {
    if (s.hist.length < 2) return er(s.exp ? "ORA-01555: snapshot too old: the undo needed is gone." : "No earlier version yet. Update and commit first.", ["fb"]);
    return ok(`AS OF an earlier time: the salary was ${s.hist[s.hist.length - 2]}.`, ["un", "fb"]);
  } },
  { l: "Undo retention expires", f: s => { s.hist = [s.cm]; s.exp = true; return li("The retention period passed. Old undo can now be overwritten.", ["un"]); } },
 ]},
"Users and privileges": {
 goal: "Connect as sam at each stage and read what Oracle says. Then grant the privileges one by one.",
 init: { u: false, cs: false, sel: false, on: false },
 hud: s => `User sam: ${yn(s.u)} | CREATE SESSION: ${yn(s.cs)} | SELECT on hr.employees: ${yn(s.sel)} | Connected: ${yn(s.on)}`,
 acts: [
  { l: "CREATE USER sam", f: s => { s.u = true; return li("Account created: name, authentication, default and temp tablespace, quota and profile are stored.", ["us", "au", "ts", "pr"]); } },
  { l: "Connect as sam", f: s => {
    if (!s.u) return er("ORA-01017: invalid username/password; logon denied", ["us", "au"]);
    if (!s.cs) return er("ORA-01045: user SAM lacks CREATE SESSION privilege; logon denied", ["au", "ro"]);
    s.on = true; return ok("Connected as sam.", ["us", "au"]);
  } },
  { l: "GRANT CREATE SESSION TO sam", f: s => { if (!s.u) return er("ORA-01917: user or role 'SAM' does not exist", ["ro"]); s.cs = true; return li("System privilege granted.", ["ro"]); } },
  { l: "sam: SELECT * FROM hr.employees", f: s => {
    if (!s.on) return er("Not connected.", ["us"]);
    if (!s.sel) return er("ORA-00942: table or view does not exist", ["ro"]);
    return li("Rows returned.", ["ro"]);
  } },
  { l: "GRANT SELECT ON hr.employees TO sam", f: s => { if (!s.u) return er("ORA-01917: user or role 'SAM' does not exist", ["ro"]); s.sel = true; return li("Object privilege granted.", ["ro"]); } },
  { l: "REVOKE SELECT", f: s => { s.sel = false; return li("Object privilege revoked.", ["ro"]); } },
  { l: "Disconnect", f: s => { s.on = false; return li("sam disconnected.", ["us"]); } },
 ]},
};