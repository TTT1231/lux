export * from "./electron";
export * from "./nest";
export * from "./node";
export * from "./uniapp";
export * from "./web";

import type { FmtPreset } from "../types";
import { webFmt, electronFmt, uniappFmt, nodeFmt, nestFmt } from ".";

export const FMT_PRESETS: FmtPreset[] = [
  webFmt,
  electronFmt,
  uniappFmt,
  nodeFmt,
  nestFmt,
];
