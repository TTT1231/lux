import type { FmtPreset, VscodePreset } from './types.js'
import { webFmt } from './fmt/web.js'
import { electronFmt } from './fmt/electron.js'
import { uniappFmt } from './fmt/uniapp.js'
import { nodeFmt } from './fmt/node.js'
import { nestFmt } from './fmt/nest.js'
import { webVscode } from './vscode/web.js'
import { electronVscode } from './vscode/electron.js'
import { uniappVscode } from './vscode/uniapp.js'
import { nodeVscode } from './vscode/node.js'
import { nestVscode } from './vscode/nest.js'
import { goVscode } from './vscode/go.js'

export const FMT_PRESETS: FmtPreset[] = [webFmt, electronFmt, uniappFmt, nodeFmt, nestFmt]

export const VSCODE_PRESETS: VscodePreset[] = [
  webVscode,
  electronVscode,
  uniappVscode,
  nodeVscode,
  nestVscode,
  goVscode,
]
