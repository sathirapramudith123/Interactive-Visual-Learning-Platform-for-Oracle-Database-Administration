import type { Item } from "../types";
import { l02 } from "./l02";
import { l03 } from "./l03";
import { l04 } from "./l04";
import { l05 } from "./l05";
import { l06 } from "./l06";
import { l07 } from "./l07";
import { l08 } from "./l08";
import { l09 } from "./l09";
import { l10 } from "./l10";
import { l11 } from "./l11";
import { guide } from "./guide";
import { myLesson } from "./mylesson";
import { sqlTable } from "./sqltable";

export const TOPIC = {
  title: "DBA",
  accent: "EXPLORER",
  tagline: "LEARN HOW ORACLE DBA WORKS",
  credit: "YOUR NAME", // change this to your name
};

// to add a lesson: create it in a data file and list it here
export const ITEMS: Item[] = [...l02, ...l03, ...l04, ...l05, ...l06, ...l07, ...l08, ...l09, ...l10, ...l11, ...guide, ...myLesson, ...sqlTable];