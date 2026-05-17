import os from 'node:os';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getPlatform, type Platform } from '../../../src/utils/platform';

describe('getPlatform', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns win32 on Windows', () => {
    vi.spyOn(os, 'platform').mockReturnValue('win32');
    expect(getPlatform()).toBe<Platform>('win32');
  });

  it('returns darwin on macOS', () => {
    vi.spyOn(os, 'platform').mockReturnValue('darwin');
    expect(getPlatform()).toBe<Platform>('darwin');
  });

  it('returns linux on Linux', () => {
    vi.spyOn(os, 'platform').mockReturnValue('linux');
    expect(getPlatform()).toBe<Platform>('linux');
  });
});
