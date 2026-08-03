import { describe, expect, it } from 'vitest';
import { calculateEditMetrics } from './editMetrics';

describe('calculateEditMetrics', () => {
  it('counts inserted and deleted Unicode text around a shared prefix/suffix', () => {
    expect(calculateEditMetrics('你好，世界', '你好，新的世界')).toEqual({
      added: 2,
      deleted: 0,
      retentionPercent: 100,
      rewritePercent: 29,
    });
  });

  it('handles a first edit and complete replacement', () => {
    expect(calculateEditMetrics('', '草稿')).toMatchObject({
      added: 2,
      deleted: 0,
      retentionPercent: 100,
    });
    expect(calculateEditMetrics('原稿', '新稿')).toMatchObject({
      added: 1,
      deleted: 1,
      retentionPercent: 50,
      rewritePercent: 100,
    });
  });
});
