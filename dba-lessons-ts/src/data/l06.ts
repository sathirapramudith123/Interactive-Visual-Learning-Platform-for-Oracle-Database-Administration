import type { Item } from "../types";
import { lesson } from "./build";

export const l06: Item[] = [
  lesson("Lecture 6 · Security", "Database security", "Authenticate, authorize, encrypt, audit", "SECURITY", 6,
    [["u", "l", "User", "login"], ["au", "h", "Authenticate", "password, MFA"], ["ac", "s", "Access", "privileges, roles"], ["en", "d", "Encrypt", "TDE, TLS"], ["ad", "f", "Audit", "logs, FGA"]],
    [
      ["Who are you?", "Authentication uses strong passwords, lockout, MFA or central login such as LDAP and Kerberos.", "Prove identity first.", "u au", "u>au", "AUTH", "Login"],
      ["What may you do?", "Authorization uses privileges and roles with least privilege. VPD adds row-level rules, and Label Security uses sensitivity labels.", "Give only the access that is needed.", "ac", "au>ac", "GRANT", "Least privilege"],
      ["Protect the data", "TDE encrypts data at rest and TLS protects data in transit. Redaction hides values on display, and masking gives fake data to test systems.", "At rest, in transit, on display.", "en", "ac>en", "TDE", "Encrypted I/O"],
      ["Watch and patch", "Auditing records who did what. A database firewall blocks SQL injection, and regular patches (CPU) close known holes.", "Layered defence, tested backups, trained staff.", "ad", "en>ad", "AUDIT", "Audit record"],
    ]),
];