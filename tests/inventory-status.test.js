import test from 'node:test';
import assert from 'node:assert/strict';
import { activeBooks, changeBookStatus, printableQueue } from '../src/inventory-status.js';
import { nextInventorySku } from '../src/inventory-storage.js';
const book = { id: 'one', sku: 'VB-20261105-005', title: 'Original', purchasePrice: '20' };
test('void retains details and reserves SKU; restore retains identity and audit trail', () => {
 const original = [book];
 const voided = changeBookStatus(original, 'one', 'void', '2026-11-06T01:00:00Z');
 assert.equal(activeBooks(voided).length, 0);
 assert.equal(voided[0].purchasePrice, '20');
 assert.equal(original[0].status, undefined);
 assert.equal(nextInventorySku({ getItem: () => null }, voided, '20261105'), 'VB-20261105-006');
 const restored = changeBookStatus(voided, 'one', 'active', '2026-11-06T02:00:00Z');
 assert.equal(activeBooks(restored)[0].sku, book.sku);
 assert.equal(restored[0].id, book.id);
 assert.deepEqual(restored[0].statusHistory.map(x => x.status), ['void', 'active']);
});
test('stale print queue excludes voided or missing books and uses current details', () => {
 const voided = changeBookStatus([book], book.id, 'void');
 assert.deepEqual(printableQueue([book], voided), []);
 assert.deepEqual(printableQueue([book], []), []);
 assert.equal(printableQueue([book], [{...book,title:'Corrected'}])[0].title,'Corrected');
});
test('repeated status changes are idempotent', () => {
 const voided = changeBookStatus([book], book.id, 'void');
 assert.equal(changeBookStatus(voided, book.id, 'void')[0].statusHistory.length, 1);
});
