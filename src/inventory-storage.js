export const BOOKS_KEY = 'vabulous_inventory_books_v1';
const COUNTERS_KEY = 'vabulous_inventory_sku_counters_v1';
export function validateBooks(books) {
  if (!Array.isArray(books)) throw new Error('Inventory must be a list.');
  const ids = new Set(), skus = new Set();
  for (const b of books) {
    if (!b || !b.id || !b.sku || !b.title || ids.has(b.id) || skus.has(b.sku)) {
      throw new Error('Inventory contains missing identifiers or duplicate SKUs. Preserve a backup before repairing it.');
    }
    ids.add(b.id); skus.add(b.sku);
  }
  return books;
}
export function readBooks(storage) {
  const raw = storage.getItem(BOOKS_KEY);
  return validateBooks(raw === null ? [] : JSON.parse(raw));
}
export function nextInventorySku(storage, books, stamp) {
  const counters = JSON.parse(storage.getItem(COUNTERS_KEY) || '{}');
  if (!counters || Array.isArray(counters) || typeof counters !== 'object') throw new Error('SKU counter is unreadable.');
  const prefix = `VB-${stamp}-`;
  const saved = counters[stamp] ?? 0;
  if (!Number.isSafeInteger(saved) || saved < 0) throw new Error('SKU counter is invalid.');
  const max = books.reduce((max, b) => b.sku.startsWith(prefix) && /^\d+$/.test(b.sku.slice(prefix.length)) ? Math.max(max, Number(b.sku.slice(prefix.length))) : max, saved);
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}
export function persistBooks(storage, books, expectedRaw) {
  validateBooks(books);
  if (storage.getItem(BOOKS_KEY) !== expectedRaw) throw new Error('Inventory changed in another tab or was cleared. Save your backup, then reload before making changes.');
  const counters = JSON.parse(storage.getItem(COUNTERS_KEY) || '{}');
  if (!counters || Array.isArray(counters) || typeof counters !== 'object') throw new Error('SKU counter is unreadable.');
  for (const book of books) {
    const match = /^VB-(\d{8})-(\d+)$/.exec(book.sku);
    if (match) counters[match[1]] = Math.max(counters[match[1]] || 0, Number(match[2]));
  }
  // Reserve numbers before the inventory write: a failed write can leave a gap, never reuse.
  storage.setItem(COUNTERS_KEY, JSON.stringify(counters));
  if (expectedRaw !== null) storage.setItem(`${BOOKS_KEY}_previous`, expectedRaw);
  const raw = JSON.stringify(books);
  storage.setItem(BOOKS_KEY, raw);
  if (storage.getItem(BOOKS_KEY) !== raw) throw new Error('Inventory save could not be verified.');
  return raw;
}
