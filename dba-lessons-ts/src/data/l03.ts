import type { Item } from "../types";
import { lesson } from "./build.js";

export const l03: Item[] = [
  lesson("Lecture 3 · Installation", "Installing Oracle", "Plan, prepare, install, configure", "CORE", 3,
    [["pl", "l", "Plan", "size, users"], ["pr", "s", "Pre-install", "OS + Preinstall RPM"], ["in", "s", "Install", "Oracle 23ai RPM"], ["cf", "d", "Database", "created"], ["ev", "l", "oracle user", "env variables"]],
    [
      ["Plan the database", "Decide the initial size and growth, the application type, the maximum users, the backup needs and the expected performance.", "Good planning avoids rebuilding later.", "pl"],
      ["Pre-installation", "Check hardware, the OS (Linux 8 or later), server configuration and storage. Then install the Oracle Preinstall RPM.", "Three phases: pre-install, install, post-install.", "pr", "pl>pr", "PLAN"],
      ["Install the software", "Download the Oracle Database 23ai RPM and install the package.", "This installs the software, not yet a database.", "in", "pr>in", "RPM"],
      ["Configure the database", "Run the configuration step. This creates the database.", "Software first, database second.", "cf", "in>cf", "CONFIG"],
      ["Set the environment", "As the oracle user, edit .bash_profile: ORACLE_SID=FREE, ORACLE_BASE, ORACLE_HOME, and add the bin folder to PATH.", "Without these, Oracle tools cannot find the database.", "ev", "cf>ev", "ENV"],
    ]),
];