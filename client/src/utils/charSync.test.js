import { describe, it, expect } from 'vitest';
import { resolveLoadAction } from './charSync';

// The load-and-merge policy for characters. localStorage is authoritative:
// the server copy may only be adopted when there is no local copy at all.
// 'adopt' → setChar(server); writeLocal(server)
// 'push'  → syncToServer(local)
// 'keep'  → do nothing (local wins)
// 'none'  → no server record to consider

describe('resolveLoadAction', () => {
  it('adopts the server copy only when there is no local copy', () => {
    expect(resolveLoadAction(null, { _id: 'a', updatedAt: '2026-01-01T00:00:00Z' })).toBe('adopt');
    expect(resolveLoadAction(undefined, { _id: 'a', updatedAt: '2026-01-01T00:00:00Z' })).toBe('adopt');
  });

  it('pushes the local copy when it is newer than the server copy', () => {
    expect(resolveLoadAction(
      { _id: 'a', updatedAt: '2026-01-02T00:00:00Z' },
      { _id: 'a', updatedAt: '2026-01-01T00:00:00Z' },
    )).toBe('push');
  });

  it('keeps local when the server copy is newer (this is the data-wipe bug)', () => {
    expect(resolveLoadAction(
      { _id: 'a', updatedAt: '2026-01-01T00:00:00Z' },
      { _id: 'a', updatedAt: '2026-01-02T00:00:00Z' },
    )).toBe('keep');
  });

  it('keeps local when the timestamps are equal', () => {
    expect(resolveLoadAction(
      { _id: 'a', updatedAt: '2026-01-01T00:00:00Z' },
      { _id: 'a', updatedAt: '2026-01-01T00:00:00Z' },
    )).toBe('keep');
  });

  it('keeps local when the local copy has no updatedAt (worst wipe case)', () => {
    expect(resolveLoadAction(
      { _id: 'a' },
      { _id: 'a', updatedAt: '2026-01-02T00:00:00Z' },
    )).toBe('keep');
  });

  it('returns none when there is no server record', () => {
    expect(resolveLoadAction({ _id: 'a', updatedAt: '2026-01-02T00:00:00Z' }, null)).toBe('none');
    expect(resolveLoadAction(null, null)).toBe('none');
  });

  it('never adopts while a local copy exists', () => {
    const stamps = [
      undefined,
      '2026-01-01T00:00:00Z',
      '2026-01-02T00:00:00Z',
      '2026-06-01T00:00:00Z',
      '1970-01-01T00:00:00Z',
    ];
    for (const lt of stamps) {
      for (const st of stamps) {
        const action = resolveLoadAction({ _id: 'a', updatedAt: lt }, { _id: 'a', updatedAt: st });
        expect(action).not.toBe('adopt');
        expect(['push', 'keep']).toContain(action);
      }
    }
  });
});
