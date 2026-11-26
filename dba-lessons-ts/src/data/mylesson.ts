import type { Item } from "../types";
import { lesson } from "./build";

export const myLesson: Item[] = [
  lesson("Lecture 12 · My topic", "Listener check", "A client asks the listener", "APPLICATION", 12,
    [
      ["c", "l", "Client", "sqlplus"],
      ["l", "s", "Listener", "port 1521"],
      ["db", "d", "Database", "service free"],
    ],
    [
      ["Client starts", "The client has the host, port and service name.", "Three facts are needed.", "c"],
      ["Ask the listener", "The request goes to port 1521.", "The listener only routes.", "l", "c>l", "TNS", "Connect request"],
      ["Reach the database", "The listener hands the client to the database service.", "Then the client talks directly.", "db", "l>db", "TNS", "Hand over"],
    ]),
];