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

interface Nd { x: number; y: number; w: number; h: number; a: string; b: string; k: string; file?: boolean }
const ND: Record<string, Nd> = {
  client: { x: 10, y: 125, w: 90, h: 50, a: "Client", b: "sqlplus", k: "user" },
  lsn: { x: 135, y: 125, w: 90, h: 50, a: "Listener", b: "port 1521", k: "mem" },
  inst: { x: 275, y: 15, w: 135, h: 52, a: "Instance", b: "SGA + processes", k: "proc" },
  ctl: { x: 275, y: 85, w: 135, h: 52, a: "Control files", b: "database map", k: "file", file: true },
  dat: { x: 275, y: 155, w: 135, h: 52, a: "Data files", b: "tables, indexes", k: "file", file: true },
  rdo: { x: 275, y: 225, w: 135, h: 52, a: "Redo logs", b: "every change", k: "file", file: true },
};
const EDGES: [string, string][] = [["client", "lsn"], ["lsn", "inst"], ["inst", "ctl"], ["ctl", "dat"], ["dat", "rdo"]];
const NS = "http://www.w3.org/2000/svg";
const sv = (n: string, a: Record<string, string | number>, p?: Element): Element => {
  const e = document.createElementNS(NS, n);
  for (const k in a) e.setAttribute(k, String(a[k]));
  p?.appendChild(e);
  return e;
};
const mid = (id: string): [number, number] => [ND[id].x + ND[id].w / 2, ND[id].y + ND[id].h / 2];

function drawNode(g: Element, n: Nd): void {
  const fill = `var(--${n.k})`, { x, y, w, h } = n, d = 9;
  let cy = y + h / 2;
  if (n.file) {
    sv("path", { class: "bs", fill, d: `M${x} ${y + d} L${x} ${y + h - d} A${w / 2} ${d} 0 0 0 ${x + w} ${y + h - d} L${x + w} ${y + d} Z` }, g);
    sv("ellipse", { class: "bs", fill, cx: x + w / 2, cy: y + d, rx: w / 2, ry: d }, g);
    sv("ellipse", { fill: "#fff", "fill-opacity": 0.35, cx: x + w / 2, cy: y + d, rx: w / 2, ry: d }, g);
    cy += 6;
  } else {
    sv("rect", { class: "bs", fill, x, y, width: w, height: h, rx: 8 }, g);
  }
  sv("text", { x: x + w / 2, y: cy - 4, "text-anchor": "middle", "font-size": 12.5, "font-weight": 700 }, g).textContent = n.a;
  sv("text", { x: x + w / 2, y: cy + 12, "text-anchor": "middle", "font-size": 10 }, g).textContent = n.b;
}

export function initLab(): void {
  const $ = (id: string) => document.getElementById(id) as HTMLElement;
  const lab = $("lab"), term = $("term"), form = $("lf"), input = $("cmd") as HTMLInputElement;
  let st: St = "SHUTDOWN", connected = false, listener = false, dirty = false;
  let ap: string[] = [], failed = false, anim = 0;
  const hist: string[] = []; let hi = 0;

  // ----- diagram -----
  const svg = $("lsv");
  svg.innerHTML = "";
  EDGES.forEach(e => {
    const a = mid(e[0]), b = mid(e[1]);
    sv("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], class: "eg" }, svg);
  });
  const route = sv("g", {}, svg);
  for (const id in ND) drawNode(sv("g", { class: "nd", id: "ln_" + id }, svg), ND[id]);
  const dot = sv("circle", { id: "ldot", r: 8, cx: 0, cy: 0, opacity: 0 }, svg);
  const xm = sv("text", { class: "xm", x: 0, y: 0 }, svg);

  function play(path: string[], fail: boolean): void {
    const my = ++anim;
    route.innerHTML = ""; xm.textContent = ""; dot.setAttribute("opacity", "0");
    document.querySelectorAll(".nd.bad").forEach(g => g.classList.remove("bad"));
    if (!path.length) return;
    const pts = path.map(mid), last = path[path.length - 1];
    const finish = (): void => {
      if (my !== anim) return;
      if (fail) {
        document.getElementById("ln_" + last)?.classList.add("bad");
        const p = pts[pts.length - 1];
        xm.setAttribute("x", String(p[0])); xm.setAttribute("y", String(p[1] - 34));
        xm.textContent = "\u2715";
      }
      setTimeout(() => {
        if (my !== anim) return;
        route.innerHTML = ""; xm.textContent = ""; dot.setAttribute("opacity", "0");
        document.getElementById("ln_" + last)?.classList.remove("bad");
      }, 2400);
    };
    if (pts.length < 2) { finish(); return; }
    const cum = [0];
    for (let i = 1; i < pts.length; i++) {
      sv("line", { x1: pts[i - 1][0], y1: pts[i - 1][1], x2: pts[i][0], y2: pts[i][1], class: "rt" }, route);
      cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    }
    const total = cum[cum.length - 1] || 1, t0 = performance.now() + 150;
    dot.setAttribute("opacity", "1");
    const step = (now: number): void => {
      if (my !== anim) return;
      const d = Math.min(Math.max(now - t0, 0) * 0.22, total);
      let i = 1;
      while (i < cum.length - 1 && cum[i] < d) i++;
      const f = (d - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
      dot.setAttribute("cx", String(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f));
      dot.setAttribute("cy", String(pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f));
      if (d < total) requestAnimationFrame(step); else finish();
    };
    requestAnimationFrame(step);
  }

  // ----- terminal -----
  const print = (t: string, cls = ""): void => {
    const d = document.createElement("div");
    d.className = "tl " + cls; d.textContent = t;
    term.appendChild(d); term.scrollTop = term.scrollHeight;
  };
  const note = (t: string): void => print("-> " + t, "tn");
  const err = (t: string): void => { failed = true; print(t, "te"); };

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
    for (const id in ND) {
      const lit = id === "client" || (id === "lsn" && listener) || (id === "inst" && st !== "SHUTDOWN") ||
        (id === "ctl" && (st === "MOUNT" || st === "OPEN")) || ((id === "dat" || id === "rdo") && st === "OPEN");
      document.getElementById("ln_" + id)?.setAttribute("class", "nd" + (lit ? " on" : ""));
    }
  }
  const need = (): boolean => {
    if (!connected) { ap = ["client"]; err("Not connected. Type: sqlplus / as sysdba"); return false; }
    return true;
  };
  const down = (): void => { ap = ["client", "inst"]; err("ORA-01034: ORACLE not available"); note("The instance is not started. Use: startup"); };

  function exec(c: string, raw: string): void {
    if (c === "help") {
      print("Try these in order:\n 1 sqlplus / as sysdba\n 2 startup nomount\n 3 alter database mount\n 4 alter database open\n Then: shutdown immediate | shutdown abort | lsnrctl start|status|stop | tnsping free\n Also: show parameter db_block_size, exit, clear");
    } else if (c === "clear") {
      term.innerHTML = "";
    } else if (c === "sqlplus / as sysdba") {
      ap = ["client", "inst"]; connected = true;
      print(st === "SHUTDOWN" ? "Connected to an idle instance." : "Connected to: Oracle Database 23ai Free");
      if (st === "SHUTDOWN") note("Connected, but the instance is off. Now type: startup nomount");
    } else if (c.startsWith("sqlplus ") && c.includes("@")) {
      if (!listener) { ap = ["client", "lsn"]; err("ORA-12541: TNS:no listener"); note("Start the listener first: lsnrctl start"); }
      else if (st === "SHUTDOWN") { ap = ["client", "lsn"]; err("ORA-12514: listener does not know of service requested"); note("The instance is off, so no service is registered with the listener."); }
      else if (st !== "OPEN") { ap = ["client", "lsn", "inst"]; err("ORA-01033: ORACLE initialization or shutdown in progress"); note("The database must be OPEN for normal users."); }
      else { ap = ["client", "lsn", "inst", "dat"]; print("Connected."); note("Listener -> server process -> database. Then the client talks directly to its server process."); }
    } else if (c === "exit") {
      connected = false; print("Disconnected.");
    } else if (c === "startup nomount") {
      ap = ["client", "inst"];
      if (!need()) return;
      if (st !== "SHUTDOWN") { err("ORA-01081: cannot start already-running ORACLE - shut it down first"); return; }
      st = "NOMOUNT"; print("ORACLE instance started.");
      note("Read spfile, allocated the SGA, started background processes.");
      if (dirty) note("Dirty (abort) shutdown: recovery runs once the database is opened.");
    } else if (c === "alter database mount") {
      ap = ["inst", "ctl"];
      if (!need()) return;
      if (st === "SHUTDOWN") return down();
      if (st !== "NOMOUNT") { err("ORA-01100: database already mounted"); return; }
      st = "MOUNT"; print("Database altered."); note("Opened the control files named in CONTROL_FILES.");
    } else if (c === "alter database open") {
      ap = ["ctl", "dat", "rdo"];
      if (!need()) return;
      if (st === "SHUTDOWN") return down();
      if (st === "NOMOUNT") { ap = ["inst", "ctl"]; err("ORA-01507: database not mounted"); note("Mount it first: alter database mount"); return; }
      if (st === "OPEN") { err("ORA-01531: a database already open by the instance"); return; }
      st = "OPEN"; print("Database altered.");
      if (dirty) { note("Instance recovery: rolled forward redo, then rolled back uncommitted work with undo."); dirty = false; }
      else note("Opened the data files, undo tablespace and redo logs.");
    } else if (c === "startup") {
      ap = ["client", "inst", "ctl", "dat", "rdo"];
      if (!need()) return;
      if (st !== "SHUTDOWN") { err("ORA-01081: cannot start already-running ORACLE - shut it down first"); return; }
      st = "OPEN"; print("ORACLE instance started.\nDatabase mounted.\nDatabase opened.");
      if (dirty) { note("Instance recovery ran automatically (redo forward, undo back)."); dirty = false; }
      else note("NOMOUNT, MOUNT and OPEN all in one command.");
    } else if (c === "shutdown abort") {
      ap = ["dat", "ctl", "inst"];
      if (!need()) return;
      if (st === "SHUTDOWN") { print("ORACLE instance shut down."); return; }
      st = "SHUTDOWN"; dirty = true; print("ORACLE instance shut down.");
      note("Dirty database: buffers not written, uncommitted work not rolled back. Next startup needs instance recovery.");
    } else if (/^shutdown( normal| immediate| transactional)?$/.test(c)) {
      ap = ["dat", "ctl", "inst"];
      if (!need()) return;
      if (st === "SHUTDOWN") { print("ORACLE instance shut down."); return; }
      st = "SHUTDOWN"; print("Database closed.\nDatabase dismounted.\nORACLE instance shut down.");
      note("Clean database: buffer cache written to data files, so no recovery is needed.");
    } else if (c === "select status from v$instance") {
      ap = ["client", "inst"];
      if (!need()) return;
      if (st === "SHUTDOWN") return down();
      print("STATUS\n------------\n" + { NOMOUNT: "STARTED", MOUNT: "MOUNTED", OPEN: "OPEN" }[st]);
    } else if (c === "select open_mode from v$database") {
      ap = ["client", "inst", "ctl"];
      if (!need()) return;
      if (st === "SHUTDOWN") return down();
      if (st === "NOMOUNT") { ap = ["client", "inst", "ctl"]; err("ORA-01507: database not mounted"); return; }
      print("OPEN_MODE\n--------------------\n" + (st === "OPEN" ? "READ WRITE" : "MOUNTED"));
    } else if (c === "select name from v$datafile") {
      ap = ["client", "inst", "ctl", "dat"];
      if (!need()) return;
      if (st === "SHUTDOWN") return down();
      if (st === "NOMOUNT") { ap = ["client", "inst", "ctl"]; err("ORA-01507: database not mounted"); note("Data file names are stored in the control files, which are read at MOUNT."); return; }
      print("NAME\n----------------------------------------\n/opt/oracle/oradata/FREE/system01.dbf\n/opt/oracle/oradata/FREE/sysaux01.dbf\n/opt/oracle/oradata/FREE/undotbs01.dbf\n/opt/oracle/oradata/FREE/users01.dbf");
    } else if (c === "show parameter db_block_size") {
      ap = ["client", "inst"];
      if (!need()) return;
      if (st === "SHUTDOWN") return down();
      print("NAME          TYPE      VALUE\n------------- --------- ------\ndb_block_size integer   8192");
    } else if (c === "lsnrctl start") {
      ap = ["client", "lsn"];
      if (listener) { err("TNS-01106: Listener using listener name LISTENER has already been started"); return; }
      listener = true; print("Listening on: (PROTOCOL=tcp)(HOST=localhost)(PORT=1521)\nThe command completed successfully");
      note("Port 1521. Running instances register their services here through LREG.");
    } else if (c === "lsnrctl stop") {
      ap = ["client", "lsn"];
      if (!listener) { err("TNS-12541: TNS:no listener"); return; }
      listener = false; print("The command completed successfully");
      note("Connected sessions keep working, but new clients cannot connect.");
    } else if (c === "lsnrctl status") {
      ap = ["client", "lsn"];
      if (!listener) { err("TNS-12541: TNS:no listener"); note("Start it: lsnrctl start"); return; }
      print("STATUS of the LISTENER\nListening Endpoints: tcp port 1521\n" + (st === "SHUTDOWN" ? "The listener supports no services" : "Service \"free\" has 1 instance(s).\n  Instance \"FREE\", status READY"));
      if (st === "SHUTDOWN") note("The instance is off, so nothing is registered.");
    } else if (c.startsWith("tnsping")) {
      ap = ["client", "lsn"];
      if (!listener) { err("TNS-12541: TNS:no listener"); return; }
      print("OK (10 msec)"); note("tnsping only proves the listener answers. It does not check that the service is available.");
    } else {
      err("Unknown command. Type: help");
    }
  }

  function run(raw: string): void {
    const c = raw.trim().replace(/;$/, "").toLowerCase().replace(/\s+/g, " ");
    if (!c) return;
    print("SQL> " + raw.trim(), "tc");
    ap = []; failed = false;
    exec(c, raw);
    play(ap, failed);
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
  const open = (): void => { lab.hidden = false; document.body.style.overflow = "hidden"; input.focus(); };
  const close = (): void => { lab.hidden = true; document.body.style.overflow = ""; };
  $("labbtn").onclick = open;
  $("labclose").onclick = close;
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !lab.hidden) close(); });
  print("Virtual Oracle lab (simulation). Type: help");
  draw();
}