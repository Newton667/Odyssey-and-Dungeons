import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_PREFIX = 'ond-char-';
const SYNC_DEBOUNCE = 1500; // ms before syncing to server

/**
 * Local-first character storage with server sync.
 *
 * - localStorage is the master copy (instant reads/writes)
 * - Server is the backup (synced in background)
 * - On load: show local instantly, fetch server in background
 * - If local is newer → push to server
 * - If server is newer → update local
 * - All mutations go to local first, then debounce-sync to server
 */
export function useCharacter(id, { syncEnabled = true } = {}) {
  const [char, setChar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const syncTimer = useRef(null);
  const lastSynced = useRef(null);
  const syncEnabledRef = useRef(syncEnabled);
  syncEnabledRef.current = syncEnabled;

  // Read from localStorage
  const readLocal = useCallback(() => {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${id}`);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, [id]);

  // Write to localStorage
  const writeLocal = useCallback((data) => {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${id}`, JSON.stringify(data));
    } catch { /* quota exceeded — ignore */ }
  }, [id]);

  // Sync local → server
  const syncToServer = useCallback(async (data) => {
    if (!syncEnabledRef.current || id?.startsWith('local-')) return;
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch(`/api/characters/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const serverData = await res.json();
        lastSynced.current = serverData.updatedAt;
      } else {
        setSyncError('Failed to sync');
      }
    } catch {
      setSyncError('Offline — changes saved locally');
    }
    setSyncing(false);
  }, [id]);

  // Schedule a debounced sync
  const scheduleSyncToServer = useCallback((data) => {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => syncToServer(data), SYNC_DEBOUNCE);
  }, [syncToServer]);

  // Load character: local first, then server
  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    // Step 1: Read from local immediately
    const local = readLocal();
    if (local) {
      setChar(local);
    }
    setLoading(false); // Always stop loading — show what we have (or "not found")

    // Skip server fetch for local-only characters
    if (id.startsWith('local-')) return;

    // Step 2: Fetch from server in background (with 3s timeout)
    const controller = new AbortController();
    const fetchTimeout = setTimeout(() => controller.abort(), 3000);
    fetch(`/api/characters/${id}`, { signal: controller.signal })
      .then(r => { clearTimeout(fetchTimeout); return r.ok ? r.json() : null; })
      .then(server => {
        if (cancelled || !server) return;

        lastSynced.current = server.updatedAt;

        if (!local) {
          // No local copy — use server
          setChar(server);
          writeLocal(server);
        } else {
          // Both exist — compare timestamps
          const localTime = new Date(local.updatedAt || 0).getTime();
          const serverTime = new Date(server.updatedAt || 0).getTime();

          if (serverTime > localTime) {
            // Server is newer — update local
            setChar(server);
            writeLocal(server);
          } else if (localTime > serverTime) {
            // Local is newer — push to server
            syncToServer(local);
          }
        }
      })
      .catch(() => {
        clearTimeout(fetchTimeout);
        setSyncError('Offline — using local data');
      });

    return () => { cancelled = true; };
  }, [id, readLocal, writeLocal, syncToServer]);

  // Cleanup timer
  useEffect(() => {
    return () => { if (syncTimer.current) clearTimeout(syncTimer.current); };
  }, []);

  // Update character (local-first)
  const updateChar = useCallback((updater) => {
    setChar(prev => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      if (!next) return prev;
      next.updatedAt = new Date().toISOString();
      writeLocal(next);
      scheduleSyncToServer(next);
      return next;
    });
  }, [writeLocal, scheduleSyncToServer]);

  // Update a single field
  const updateField = useCallback((field, value) => {
    updateChar(prev => ({ ...prev, [field]: value }));
  }, [updateChar]);

  // Update HP specifically (also syncs via PATCH for speed)
  const updateHp = useCallback((currentHp, temporaryHp) => {
    setChar(prev => {
      if (!prev) return prev;
      const next = { ...prev, updatedAt: new Date().toISOString() };
      if (currentHp !== undefined) next.currentHp = currentHp;
      if (temporaryHp !== undefined) next.temporaryHp = temporaryHp;
      writeLocal(next);
      // Use PATCH for HP (faster endpoint)
      fetch(`/api/characters/${id}/hp`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentHp: next.currentHp, temporaryHp: next.temporaryHp }),
      }).catch(() => {});
      return next;
    });
  }, [id, writeLocal]);

  // Force sync now
  const forceSync = useCallback(() => {
    const data = readLocal();
    if (data) syncToServer(data);
  }, [readLocal, syncToServer]);

  return { char, loading, syncing, syncError, setChar: updateChar, updateField, updateHp, forceSync };
}

/**
 * Get all characters from localStorage (for list page).
 * Falls back to server if no local data.
 */
export function useCharacterList() {
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Read all local characters
    const localChars = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          if (data && data._id) localChars.push(data);
        } catch { /* skip corrupt */ }
      }
    }

    setCharacters(localChars.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)));
    setLoading(false);

    // Also fetch from server to discover new characters (3s timeout)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    fetch('/api/characters', { signal: controller.signal })
      .then(r => { clearTimeout(timeout); return r.json(); })
      .then(serverChars => {
        const merged = new Map();
        // Add local chars
        localChars.forEach(c => merged.set(c._id, c));
        // Merge server chars
        (serverChars || []).forEach(sc => {
          const local = merged.get(sc._id);
          if (!local) {
            // New from server — save locally
            merged.set(sc._id, sc);
            try { localStorage.setItem(`${STORAGE_PREFIX}${sc._id}`, JSON.stringify(sc)); } catch {}
          } else {
            // Compare timestamps
            const lt = new Date(local.updatedAt || 0).getTime();
            const st = new Date(sc.updatedAt || 0).getTime();
            if (st > lt) {
              merged.set(sc._id, sc);
              try { localStorage.setItem(`${STORAGE_PREFIX}${sc._id}`, JSON.stringify(sc)); } catch {}
            }
          }
        });
        const result = [...merged.values()].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
        setCharacters(result);
        setLoading(false);
      })
      .catch(() => { clearTimeout(timeout); });
  }, []);

  // Delete character from both local and server
  const deleteCharacter = useCallback(async (id) => {
    localStorage.removeItem(`${STORAGE_PREFIX}${id}`);
    setCharacters(prev => prev.filter(c => c._id !== id));
    try { await fetch(`/api/characters/${id}`, { method: 'DELETE' }); } catch {}
  }, []);

  return { characters, loading, deleteCharacter };
}

/**
 * Save a newly created character to both local and server.
 */
export async function createCharacter(data) {
  // Try server first (with 3s timeout)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch('/api/characters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      const created = await res.json();
      if (created._id) {
        try { localStorage.setItem(`${STORAGE_PREFIX}${created._id}`, JSON.stringify(created)); } catch {}
      }
      return { ok: true, data: created };
    }
  } catch { /* server unavailable or timeout — fall through to local-only */ }

  // Local-only fallback: generate a local ID
  const localId = 'local-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
  const created = { ...data, _id: localId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  try { localStorage.setItem(`${STORAGE_PREFIX}${localId}`, JSON.stringify(created)); } catch {}

  // Add to character list index
  try {
    const index = JSON.parse(localStorage.getItem('ond-char-index') || '[]');
    index.push(localId);
    localStorage.setItem('ond-char-index', JSON.stringify(index));
  } catch {}

  return { ok: true, data: created };
}
