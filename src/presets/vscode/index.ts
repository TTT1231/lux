import type { VscodePreset } from '../types';

import { webVueVscode } from './web-vue';
import { webReactVscode } from './web-react';
import { electronVueVscode } from './electron';
import { uniappVscode } from './uniapp';
import { nodeVscode } from './node';
import { nestVscode } from './nest';
import { goVscode } from './go';

export const VSCODE_PRESETS: VscodePreset[] = [
   webVueVscode,
   webReactVscode,
   electronVueVscode,
   uniappVscode,
   nodeVscode,
   nestVscode,
   goVscode,
];
