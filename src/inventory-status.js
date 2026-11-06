export function isVoided(book) { return book.status === 'void'; }
export function activeBooks(books) { return books.filter(book => !isVoided(book)); }
export function changeBookStatus(books, id, status, at = new Date().toISOString()) {
  if (!['active', 'void'].includes(status)) throw new Error('Invalid inventory status.');
  if (!books.some(book => book.id === id)) throw new Error('Book not found.');
  return books.map(book => {
    if (book.id !== id || (isVoided(book) ? 'void' : 'active') === status) return book;
    return { ...book, status, statusHistory: [...(book.statusHistory || []), { status, at }] };
  });
}
export function printableQueue(queue, books) {
  return queue.map(item => books.find(book => book.id === item.id)).filter(book => book && !isVoided(book));
}
