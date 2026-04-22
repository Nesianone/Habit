const DB_NAME = 'habit-wheel';
const DB_VERSION = 1;
let _db = null;

/** Open (or upgrade) the database. Must be called before any other db function. */
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('logs')) {
        const logs = db.createObjectStore('logs', { keyPath: 'id' });
        logs.createIndex('by_date', 'date');
        logs.createIndex('by_habit', 'habitId');
      }
      if (!db.objectStoreNames.contains('months')) {
        db.createObjectStore('months', { keyPath: 'id' });
      }
    };

    req.onsuccess = e => { _db = e.target.result; resolve(_db); };
    req.onerror  = e => reject(e.target.error);
  });
}

/** Run a transaction and return a promise. mode: 'readonly' | 'readwrite' */
function tx(storeName, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = _db.transaction(storeName, mode);
    const store = t.objectStore(storeName);
    const req = fn(store);
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

/**
 * Get all log records for a given month string "YYYY-MM".
 * Returns array of { id, habitId, date, status }.
 */
function getLogsForMonth(yearMonth) {
  return new Promise((resolve, reject) => {
    const t = _db.transaction('logs', 'readonly');
    const store = t.objectStore('logs');
    const index = store.index('by_date');
    const range = IDBKeyRange.bound(`${yearMonth}-01`, `${yearMonth}-31`);
    const req = index.getAll(range);
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

/**
 * Save or update a single log entry.
 * log: { habitId, date "YYYY-MM-DD", status "done"|"missed"|null }
 */
function saveLog(log) {
  log.id = `${log.habitId}-${log.date}`;
  return tx('logs', 'readwrite', store => store.put(log));
}

/** Get month record { id, observations, goals[] } or null */
function getMonth(yearMonth) {
  return tx('months', 'readonly', store => store.get(yearMonth));
}

/**
 * Save month record { id: "YYYY-MM", observations, goals[] }.
 * Callers must always provide monthData.id — it is required.
 */
function saveMonth(monthData) {
  if (!monthData.id) throw new Error('saveMonth: monthData.id is required');
  return tx('months', 'readwrite', store => store.put(monthData));
}

/** Get ALL logs (for export) */
function getAllLogs() {
  return new Promise((resolve, reject) => {
    const t = _db.transaction('logs', 'readonly');
    const req = t.objectStore('logs').getAll();
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

/** Get ALL month records (for export) */
function getAllMonths() {
  return new Promise((resolve, reject) => {
    const t = _db.transaction('months', 'readonly');
    const req = t.objectStore('months').getAll();
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}
