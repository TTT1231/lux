import os from 'node:os';

export type Platform = 'win32' | 'darwin' | 'linux';

export function getPlatform(): Platform {
   return os.platform() as Platform;
}
