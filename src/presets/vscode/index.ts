import type { VscodePreset } from '../types';

import { webVscode } from './web';
import { electronVscode } from './electron';
import { uniappVscode } from './uniapp';
import { nodeVscode } from './node';
import { nestVscode } from './nest';
import { goVscode } from './go';

export const VSCODE_PRESETS: VscodePreset[] = [
   webVscode,
   electronVscode,
   uniappVscode,
   nodeVscode,
   nestVscode,
   goVscode,
];
