/**
 * Character load-and-merge policy.
 *
 * localStorage is authoritative. The server copy is a write-only backup plus a
 * discovery source for characters this browser has never seen — it must never
 * replace an existing local document, because the sheet writes fields the
 * server backup has never held (equipped items, ammo, spent spell slots,
 * feature uses, multiclass `classes`, ...). Adopting a "newer" server record
 * over a local one is exactly how those fields got wiped.
 *
 * @returns {'adopt'|'push'|'keep'|'none'}
 *   'adopt' → setChar(server); writeLocal(server)   (no local copy exists)
 *   'push'  → syncToServer(local)                   (local is newer)
 *   'keep'  → do nothing; the local copy wins
 *   'none'  → no server record to consider
 */
export function resolveLoadAction(local, server) {
  if (!server) return 'none';
  if (!local) return 'adopt';
  const localTime = new Date(local.updatedAt || 0).getTime();
  const serverTime = new Date(server.updatedAt || 0).getTime();
  if (localTime > serverTime) return 'push';
  return 'keep';
}
