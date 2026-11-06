import test from 'node:test';
import assert from 'node:assert/strict';
import { BOOKS_KEY, readBooks, persistBooks, nextInventorySku } from '../src/inventory-storage.js';
const book = n => ({ id: String(n), title: 'Book ' + n, sku: `VB-20261105-${String(n).padStart(3,'0')}` });
function storage() { const map = new Map(); return { getItem: k => map.get(k) ?? null, setItem: (k,v) => map.set(k,v) }; }
test('gaps and deletion never reuse reserved numbers', () => {
 const s = storage(); const raw = persistBooks(s, [book(1), book(5)], null);
 assert.equal(nextInventorySku(s, [book(1),book(5)], '20261105'), 'VB-20261105-006');
 persistBooks(s, [book(1)], raw);
 assert.equal(nextInventorySku(s, [book(1)], '20261105'), 'VB-20261105-006');
});
test('stale tab cannot overwrite or resurrect records', () => {
 const s = storage(); persistBooks(s, [book(1)], null);
 assert.throws(() => persistBooks(s, [book(2)], null), /another tab/);
 assert.equal(readBooks(s)[0].sku, book(1).sku);
});
test('corrupt inventory fails closed and duplicate imports rejected', () => {
 const s=storage(); s.setItem(BOOKS_KEY, '{broken');
 assert.throws(() => readBooks(s));
 assert.throws(() => persistBooks(s, [book(1),book(1)], '{broken'), /duplicate/);
 assert.equal(s.getItem(BOOKS_KEY), '{broken');
});
test('failed save preserves original inventory', () => {
 const s=storage(); const raw = persistBooks(s, [book(1)], null);
 const failing = { getItem: s.getItem, setItem: () => { throw Error('quota'); } };
 assert.throws(() => persistBooks(failing,[book(2)],raw), /quota/);
 assert.equal(s.getItem(BOOKS_KEY),raw);
});
