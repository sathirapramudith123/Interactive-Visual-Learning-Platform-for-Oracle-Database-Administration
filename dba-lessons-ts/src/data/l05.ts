import type { Item } from "../types";
import { lesson } from "./build";

const L = "Lecture 5 · Network";
export const l05: Item[] = [
  lesson(L, "How a client connects", "Listener, service name and server process", "APPLICATION", 5,
    [["c", "l", "Client", "connect string"], ["l", "s", "Listener", "port 1521"], ["sp", "s", "Server process", "one per session"], ["df", "d", "Database files", "data, redo"]],
    [
      ["Connect string", "The client needs the host, port and service name, for example scott/tiger@sales.", "Easy Connect or tnsnames.ora turns a name into an address.", "c"],
      ["Knock on the listener", "The request goes to the listener, usually on port 1521.", "The listener only receives and routes requests.", "l", "c>l", "TNS", "Connect request"],
      ["A server process starts", "After the username and password are accepted, the listener hands the request to a server process.", "Dedicated server = one process per session.", "sp", "l>sp", "TNS", "Hand over"],
      ["Talk directly", "Now the client talks straight to its server process. The listener steps aside.", "The listener is not in the data path.", "", "c>sp", "SQL*Net", "Direct session"],
      ["Use the files", "The server process reads and writes the database files for this session.", "Server process = the worker for one user.", "df", "sp>df", "I/O", "Read and write"],
    ]),

  lesson(L, "Naming methods", "How a name becomes an address", "APPLICATION", 5,
    [["ez", "s", "Easy Connect", "host:port/service"], ["lo", "f", "tnsnames.ora", "local naming"], ["di", "d", "LDAP directory", "directory naming"], ["ex", "s", "External naming", "non-Oracle service"], ["tp", "l", "tnsping", "tests the listener"]],
    [
      ["What is a naming method?", "It is the way a client turns a connect identifier into a connect descriptor, which holds the host, port and service name.", "Name in, address out.", "ez lo di ex"],
      ["Easy Connect", "Enabled by default and needs no client configuration. It supports only TCP/IP and has no failover or load balancing. Example: sqlplus hr/hr@db.us.oracle.com:1521/dba10g", "Quick and simple.", ""],
      ["Local naming", "The client keeps a tnsnames.ora file. It supports all Oracle Net protocols, connect-time failover, source routing and load balancing.", "The most flexible local option.", ""],
      ["Directory and external", "Directory naming uses a central LDAP-compliant directory server. External naming uses a supported non-Oracle naming service.", "Central management for many clients.", ""],
      ["tnsping", "tnsping checks that the client can reach the listener. It does not prove that the requested service is available.", "Listener reachable is not the same as service available.", "tp"],
    ], { e: [] }),
];