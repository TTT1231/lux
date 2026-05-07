export * from './electron-vue';
export * from './nest';
export * from './node';
export * from './uniapp';
export * from './web-vue';

import type { FmtPreset } from '../types';
import { webVueFmt, electronVueFmt, uniappFmt, nodeFmt, nestFmt } from '.';

export const FMT_PRESETS: FmtPreset[] = [webVueFmt, electronVueFmt, uniappFmt, nodeFmt, nestFmt];
