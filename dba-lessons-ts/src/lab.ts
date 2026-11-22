type St = "SHUTDOWN" | "NOMOUNT" | "MOUNT" | "OPEN";
const ORDER: St[] = ["SHUTDOWN", "NOMOUNT", "MOUNT", "OPEN"];
const INFO: Record<St, string> = {
  SHUTDOWN: "Instance is off. Only the files exist on disk.",
  NOMOUNT: "Instance started: spfile read, SGA and background processes running.",
  MOUNT: "Control files opened. Oracle knows where the data files are.",
  OPEN: "Data files and redo logs opened. Users can work.",
};
const CHIPS = [
  "sqlplus / as sysdba", "startup nomount", "alter database mount", "alter database open",
  "select status from v$instance", "select name from v$datafile", "shutdown immediate", "shutdown abort",
  "lsnrctl start", "lsnrctl status", "tnsping free", "sqlplus hr/hr@free", "help",
];

export function initLab(): void {
  const $ = (id: string) => document.getElementById(id) as HTMLElement;
  const lab = $("lab"), term = $("term"), form = $("lf"), input = $("cmd") as HTMLInputElement;
  let st: St = "SHUTDOWN", connected = false, listener = false, dirty = false;
  const hist: string[] = []; let hi = 0;

  const print = (t: string, cls = ""): void => {
    const d = document.createElement("div");
    d.className = "tl " + cls; d.textContent = t;
    term.appendChild(d); term.scrollTop = term.scrollHeight;
  };
  const note = (t: string): void => print("-> " + t, "tn");
  const err = (t: string): void => print(t, "te");

  function draw(): void {
    $("lsts").innerHTML = "";
    ORDER.forEach((s, i) => {
      const b = document.createElement("div");
      b.className = "stt" + (s === st ? " act" : ORDER.indexOf(st) > i ? " pass" : "");
      b.textContent = (i + 1) + ". " + s;
      $("lsts").appendChild(b);
    });
    $("linfo").textContent = INFO[st];
    $("lbadge").textContent = `Listener: ${listener ? "ON" : "OFF"}${dirty ? "  |  Needs instance recovery" : ""}`;
  }
  const need = (): boolean => { if (!connected) { err("Not connected. Type: sqlplus / as sysdba"); return false; } return true; };
  const down = (): void => { err("ORA-01034: ORACLE not available"); note("The instance is not started. Use: startup"); };

  function run(raw: string): void {
    const c = raw.trim().replace(/;$/, "").toLowerCase().replace(/\s+/g, " ");
    if (!c) return;
    print("SQL> " + raw.trim(), "tc");

    if (c === "help") {
      print("Try these in order:\n 1 sqlplus / as sysdba\n 2 startup nomount\n 3 alter database mount\n 4 alter database open\n Then: shutdown immediate | shutdown abort | lsnrctl start|status|stop | tnsping free\n Also: show parameter db_block_size, exit, clear");
    } else if (c === "clear") {
      term.innerHTML = "";
    } else if (c === "sqlplus / as sysdba") {
      connected = true;
      print(st === "SHUTDOWN" ? "Connected to an idle instance." : "Connected to: Oracle Database 23ai Free");
      if (st === "SHUTDOWN") note("Connected, but the instance is off. Now type: startup nomount");
    } else if (c.startsWith("sqlplus ") && c.includes("@")) {
      if (!listener) { err("ORA-12541: TNS:no listener"); note("Start the listener first: lsnrctl start"); }
      else if (st === "SHUTDOWN") { err("ORA-12514: listener does not know of service requested"); note("The instance is off, so no service is registered with the listener."); }
      else if (st !== "OPEN") { err("ORA-01033: ORACLE initialization or shutdown in progress"); note("The database must be OPEN for normal users."); }
      else { print("Connected."); note("Listener -> server process -> database. Client now talks directly to its server process."); }
    } else if (c === "exit") {
      connected = false; print("Disconnected.");
    } else if (c === "startup nomount") {
      if (!need()) return;
      if (st !== "SHUTDOWN") { err("ORA-01081: cannot start already-running ORACLE - shut it down first"); return; }
      st = "NOMOUNT"; print("ORACLE instance started.");
      note("Read spfile, allocated the SGA, started background processes.");
      if (dirty) note("Dirty (abort) shutdown: recovery runs once the database is opened.");
    } else if (c === "alter database mount") {
      if (!need()) return;
      if (st === "SHUTDOWN") return down();
      if (st !== "NOMOUNT") { err("ORA-01100: database already mounted"); return; }
      st = "MOUNT"; print("Database altered."); note("Opened the control files named in CONTROL_FILES.");
    } else if (c === "alter database open") {
      if (!need()) return;
      if (st === "SHUTDOWN") return down();
      if (st === "NOMOUNT") { err("ORA-01507: database not mounted"); note("Mount it first: alter database mount"); return; }
      if (st === "OPEN") { err("ORA-01531: a database already open by the instance"); return; }
      st = "OPEN"; print("Database altered.");
      if (dirty) { note("Instance recovery: rolled forward redo, then rolled back uncommitted work with undo."); dirty = false; }
      else note("Opened the data files, undo tablespace and redo logs.");
    } else if (c === "startup") {
      if (!need()) return;
      if (st !== "SHUTDOWN") { err("ORA-01081: cannot start already-running ORACLE - shut it down first"); return; }
      st = "OPEN"; print("ORACLE instance started.\nDatabase mounted.\nDatabase opened.");
      if (dirty) { note("Instance recovery ran automatically (redo forward, undo back)."); dirty = false; }
      else note("NOMOUNT, MOUNT and OPEN all in one command.");
    } else if (c === "shutdown abort") {
      if (!need()) return;
      if (st === "SHUTDOWN") { print("ORACLE instance shut down."); return; }
      st = "SHUTDOWN"; dirty = true; print("ORACLE instance shut down.");
      note("Dirty database: buffers not written, uncommitted work not rolled back. Next startup needs instance recovery.");
    } else if (/^shutdown( normal| immediate| transactional)?$/.test(c)) {
      if (!need()) return;
      if (st === "SHUTDOWN") { print("ORACLE instance shut down."); return; }
      st = "SHUTDOWN"; print("Database closed.\nDatabase dismounted.\nORACLE instance shut down.");
      note("Clean database: buffer cache written to data files, so no recovery is needed.");
    } else if (c === "select status from v$instance") {
      if (!need()) return;
      if (st === "SHUTDOWN") return down();
      print("STATUS\n------------\n" + { NOMOUNT: "STARTED", MOUNT: "MOUNTED", OPEN: "OPEN" }[st]);
    } else if (c === "select open_mode from v$database") {
      if (!need()) return;
      if (st === "SHUTDOWN") return down();
      if (st === "NOMOUNT") { err("ORA-01507: database not mounted"); return; }
      print("OPEN_MODE\n--------------------\n" + (st === "OPEN" ? "READ WRITE" : "MOUNTED"));
    } else if (c === "select name from v$datafile") {
      if (!need()) return;
      if (st === "SHUTDOWN") return down();
      if (st === "NOMOUNT") { err("ORA-01507: database not mounted"); note("Data file names are stored in the control files, which are read at MOUNT."); return; }
      print("NAME\n----------------------------------------\n/opt/oracle/oradata/FREE/system01.dbf\n/opt/oracle/oradata/FREE/sysaux01.dbf\n/opt/oracle/oradata/FREE/undotbs01.dbf\n/opt/oracle/oradata/FREE/users01.dbf");
    } else if (c === "show parameter db_block_size") {
      if (!need()) return;
      if (st === "SHUTDOWN") return down();
      print("NAME          TYPE      VALUE\n------------- --------- ------\ndb_block_size integer   8192");
    } else if (c === "lsnrctl start") {
      if (listener) { err("TNS-01106: Listener using listener name LISTENER has already been started"); return; }
      listener = true; print("Listening on: (PROTOCOL=tcp)(HOST=localhost)(PORT=1521)\nThe command completed successfully");
      note("Port 1521. Running instances register their services here through LREG.");
    } else if (c === "lsnrctl stop") {
      if (!listener) { err("TNS-12541: TNS:no listener"); return; }
      listener = false; print("The command completed successfully");
      note("Connected sessions keep working, but new clients cannot connect.");
    } else if (c === "lsnrctl status") {
      if (!listener) { err("TNS-12541: TNS:no listener"); note("Start it: lsnrctl start"); return; }
      print("STATUS of the LISTENER\nListening Endpoints: tcp port 1521\n" + (st === "SHUTDOWN" ? "The listener supports no services" : "Service \"free\" has 1 instance(s).\n  Instance \"FREE\", status READY"));
      if (st === "SHUTDOWN") note("The instance is off, so nothing is registered.");
    } else if (c.startsWith("tnsping")) {
      if (!listener) { err("TNS-12541: TNS:no listener"); return; }
      print("OK (10 msec)"); note("tnsping only proves the listener answers. It does not check that the service is available.");
    } else {
      err("Unknown command. Type: help");
    }
  }

  CHIPS.forEach(t => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "chip"; b.textContent = t;
    b.onclick = () => { run(t); draw(); input.focus(); };
    $("chips").appendChild(b);
  });
  form.onsubmit = e => {
    e.preventDefault();
    const v = input.value; if (!v.trim()) return;
    hist.push(v); hi = hist.length; run(v); input.value = ""; draw();
  };
  input.onkeydown = e => {
    if (e.key === "ArrowUp" && hi > 0) { input.value = hist[--hi]; e.preventDefault(); }
    else if (e.key === "ArrowDown") { input.value = hi < hist.length - 1 ? hist[++hi] : ""; hi = Math.min(hi, hist.length); }
    e.stopPropagation();
  };
  $("labbtn").onclick = () => {
    lab.hidden = !lab.hidden;
    $("labbtn").textContent = lab.hidden ? "Lab" : "Close lab";
    if (!lab.hidden) { input.focus(); lab.scrollIntoView({ behavior: "smooth" }); }
  };
  print("Virtual Oracle lab (simulation). Type: help");
  draw();
}