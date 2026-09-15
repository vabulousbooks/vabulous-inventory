import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const STORAGE_KEY = 'vabulous_inventory_books_v1';
const QUEUE_KEY = 'vabulous_inventory_queue_v1';

const WHATNOT_CONDITIONS = [
  'Brand New',
  'Like New',
  'Very Good',
  'Good',
  'Fair',
  'Poor'
];

const WHATNOT_SUBCATEGORIES = [
  'Rare & Vintage Books',
  'New & Used Books',
  'Graphic Novels',
  'Magazines'
];

const fields = [
  ['isbn', 'ISBN'],
  ['location', 'Location'],
  ['title', 'Title'],
  ['author', 'Author'],
  ['publisher', 'Publisher'],
  ['year', 'Year'],
  ['edition', 'Edition'],
  ['condition', 'Detailed Condition'],
  ['binding', 'Binding'],
  ['dustJacket', 'Dust Jacket'],
  ['signed', 'Signed'],
  ['source', 'Source'],
  ['weight', 'Weight'],
  ['dateListed', 'Date Listed'],
  ['platforms', 'Platforms'],
  ['purchasePrice', 'Purchase Price'],
  ['listingPrice', 'Listing Price'],
  ['notes', 'Notes']
];

function emptyForm() {
  return {
    dustJacket: '',
    signed: '',
    condition: '',
    binding: '',
    whatnotSubcategory: 'Rare & Vintage Books',
    whatnotCondition: 'Very Good',
    whatnotStartingBid: ''
  };
}

function load(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function dateStamp(d = new Date()) {
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

function nextSku(books) {
  const prefix = `VB-${dateStamp()}-`;
  const count = books.filter(b => b.sku?.startsWith(prefix)).length + 1;
  return `${prefix}${String(count).padStart(3, '0')}`;
}

function money(v) {
  return v ? `$${Number(v).toFixed(2)}` : '';
}

function csvEscape(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function downloadCsv(filename, headers, rows) {
  const csv = [headers, ...rows]
    .map(row => row.map(csvEscape).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function buildWhatnotDescription(book) {
  const bibliographic = [
    book.author,
    book.publisher,
    book.year,
    book.edition
  ].filter(Boolean).join('. ');

  const features = [];
  if (book.binding) features.push(`Binding: ${book.binding}`);
  if (book.dustJacket) features.push(`Dust Jacket: ${book.dustJacket}`);
  if (book.signed) features.push(`Signed: ${book.signed}`);

  const parts = [];

  if (bibliographic) parts.push(bibliographic + '.');
  if (features.length) parts.push(features.join('. ') + '.');
  if (book.condition) parts.push(`Condition: ${book.condition}`);
  if (book.notes) parts.push(book.notes);

  return parts.join(' ').trim();
}

function getShippingProfile(weight) {
  if (!weight) return '';

  const text = String(weight).toLowerCase().trim();

  let ounces = 0;

  const lbMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:lb|lbs|pound|pounds)/);
  const ozMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:oz|ounce|ounces)/);

  if (lbMatch) ounces += Number(lbMatch[1]) * 16;
  if (ozMatch) ounces += Number(ozMatch[1]);

  if (!lbMatch && !ozMatch) {
    const numberOnly = Number(text);
    if (!Number.isNaN(numberOnly)) ounces = numberOnly;
  }

  if (!ounces) return '';

  if (ounces <= 1) return '0-1 oz';
  if (ounces <= 3) return '1-3 oz';
  if (ounces <= 7) return '4-7 oz';
  if (ounces <= 11) return '8-11 oz';
  if (ounces <= 15) return '12-15 oz';
  if (ounces <= 16) return '1 lb';
  if (ounces <= 32) return '1-2 lbs';
  if (ounces <= 48) return '2-3 lbs';
  if (ounces <= 64) return '3-4 lbs';
  if (ounces <= 96) return '4-6 lbs';
  return '10-14 lbs';
}

function App() {
  const [books, setBooks] = useState(() => load(STORAGE_KEY, []));
  const [queue, setQueue] = useState(() => load(QUEUE_KEY, []));
  const [tab, setTab] = useState('add');
  const [query, setQuery] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [selected, setSelected] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const sku = useMemo(() => nextSku(books), [books]);

  const update = (key, value) => {
    setForm(f => ({ ...f, [key]: value }));
  };

  function submit(e) {
    e.preventDefault();

    if (!form.title?.trim()) {
      return alert('Please enter a title.');
    }

    if (editingId) {
  const updatedBooks = books.map(b =>
    b.id === editingId
      ? { ...b, ...form, id: b.id, sku: b.sku, timestamp: b.timestamp }
      : b
  );

  const updatedQueue = queue.map(b =>
    b.id === editingId
      ? { ...b, ...form, id: b.id, sku: b.sku, timestamp: b.timestamp }
      : b
  );

  setBooks(updatedBooks);
  setQueue(updatedQueue);

  save(STORAGE_KEY, updatedBooks);
  save(QUEUE_KEY, updatedQueue);

  setForm(emptyForm());
  setEditingId(null);
  setTab('inventory');

  alert('Book updated.');
  return;
}

const book = {
  ...form,
  id: crypto.randomUUID(),
  sku,
  timestamp: new Date().toISOString()
};

const nextBooks = [book, ...books];
const nextQueue = [...queue, book].slice(-6);

setBooks(nextBooks);
setQueue(nextQueue);

save(STORAGE_KEY, nextBooks);
save(QUEUE_KEY, nextQueue);

setForm(emptyForm());

if (nextQueue.length === 6) {
  setTab('print');
} else {
  alert(`${book.sku} saved. Print queue: ${nextQueue.length} of 6.`);
}
  }

  function editBook(book) {
  setForm({ ...book });
  setEditingId(book.id);
  setTab('add');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
  
  function clearQueue() {
    setQueue([]);
    save(QUEUE_KEY, []);
  }

  function printSheet() {
    window.print();
  }

  function deleteBook(id) {
  if (!window.confirm('Delete this book from inventory? This cannot be undone.')) return;

  const nextBooks = books.filter(book => book.id !== id);
  const nextQueue = queue.filter(book => book.id !== id);

  setBooks(nextBooks);
  setQueue(nextQueue);
  save(STORAGE_KEY, nextBooks);
  save(QUEUE_KEY, nextQueue);
}
  
  function exportCsv() {
    const headers = [
      'TIMESTAMP',
      'SKU',
      'ISBN',
      'LOCATION',
      'TITLE',
      'AUTHOR',
      'PUBLISHER',
      'YEAR',
      'EDITION',
      'CONDITION',
      'BINDING',
      'DUST JACKET',
      'SIGNED',
      'SOURCE',
      'WEIGHT',
      'DATE LISTED',
      'PLATFORMS',
      'PURCHASE PRICE',
      'LISTING PRICE',
      'SOLD PRICE',
      'DATE SOLD',
      'PROFIT',
      'DAYS TO SELL',
      'NOTES'
    ];

    const rows = books.map(b => [
      b.timestamp,
      b.sku,
      b.isbn,
      b.location,
      b.title,
      b.author,
      b.publisher,
      b.year,
      b.edition,
      b.condition,
      b.binding,
      b.dustJacket,
      b.signed,
      b.source,
      b.weight,
      b.dateListed,
      b.platforms,
      b.purchasePrice,
      b.listingPrice,
      '',
      '',
      '',
      '',
      b.notes
    ]);

    downloadCsv(
      `vabulous-inventory-${dateStamp()}.csv`,
      headers,
      rows
    );
  }

  function toggleSelected(id) {
    setSelected(current =>
      current.includes(id)
        ? current.filter(x => x !== id)
        : [...current, id]
    );
  }

  function selectAllShown() {
    const shownIds = shown.map(b => b.id);
    const allShownSelected =
      shownIds.length > 0 &&
      shownIds.every(id => selected.includes(id));

    if (allShownSelected) {
      setSelected(current =>
        current.filter(id => !shownIds.includes(id))
      );
    } else {
      setSelected(current =>
        [...new Set([...current, ...shownIds])]
      );
    }
  }

  function exportWhatnotCsv() {
    const chosen = books.filter(b => selected.includes(b.id));

    if (!chosen.length) {
      return alert('Select at least one book to export to Whatnot.');
    }

    const headers = [
      'Category',
      'Sub Category',
      'Title',
      'Description',
      'Quantity',
      'Type',
      'Price',
      'Shipping Profile',
      'Offerable',
      'Hazmat',
      'Condition',
      'Cost Per Item',
      'SKU',
      'Image URL 1',
      'Image URL 2',
      'Image URL 3',
      'Image URL 4',
      'Image URL 5',
      'Image URL 6',
      'Image URL 7',
      'Image URL 8'
    ];

    const rows = chosen.map(b => [
      'Books',
      b.whatnotSubcategory || 'Rare & Vintage Books',
      b.title || '',
      buildWhatnotDescription(b),
      '1',
      'Auction',
      b.whatnotStartingBid || b.listingPrice || '',
      getShippingProfile(b.weight),
      '',
      'Not Hazmat',
      b.whatnotCondition || 'Very Good',
      b.purchasePrice || '',
      b.sku || '',
      b.imageUrl1 || '',
      b.imageUrl2 || '',
      b.imageUrl3 || '',
      b.imageUrl4 || '',
      b.imageUrl5 || '',
      b.imageUrl6 || '',
      b.imageUrl7 || '',
      b.imageUrl8 || ''
    ]);

    downloadCsv(
      `vabulous-whatnot-${dateStamp()}.csv`,
      headers,
      rows
    );
  }

  const shown = books.filter(b =>
    `${b.sku} ${b.title} ${b.author} ${b.isbn}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  return (
    <div className="app">
      <header>
        <div>
          <h1>Vabulous Inventory</h1>
          <p>Book inventory prototype</p>
        </div>
        <div className="badge">Queue {queue.length}/6</div>
      </header>

      <nav>
        <button
          className={tab === 'add' ? 'active' : ''}
          onClick={() => setTab('add')}
        >
          Add Book
        </button>

        <button
          className={tab === 'inventory' ? 'active' : ''}
          onClick={() => setTab('inventory')}
        >
          Inventory
        </button>

        <button
          className={tab === 'print' ? 'active' : ''}
          onClick={() => setTab('print')}
        >
          Print Queue
        </button>
      </nav>

      {tab === 'add' && (
        <main>
          <section className="card">
            <div className="sku">
              <span>Next SKU</span>
              <strong>{sku}</strong>
            </div>
          </section>

          <form className="card form" onSubmit={submit}>
            <div className="grid">
              {fields.map(([k, label]) =>
                k === 'notes' ? (
                  <label className="wide" key={k}>
                    {label}
                    <textarea
                      value={form[k] || ''}
                      onChange={e => update(k, e.target.value)}
                    />
                  </label>
                ) : ['dustJacket', 'signed'].includes(k) ? (
                  <label key={k}>
                    {label}
                    <select
                      value={form[k] || ''}
                      onChange={e => update(k, e.target.value)}
                    >
                      <option value="">Select</option>
                      <option>Yes</option>
                      <option>No</option>
                    </select>
                  </label>
                ) : (
                  <label
                    className={
                      ['title', 'author', 'publisher'].includes(k)
                        ? 'wide'
                        : ''
                    }
                    key={k}
                  >
                    {label}
                    {k === 'title' && ' *'}
                    <input
                      type={
                        ['purchasePrice', 'listingPrice'].includes(k)
                          ? 'number'
                          : k === 'dateListed'
                          ? 'date'
                          : 'text'
                      }
                      step="0.01"
                      value={form[k] || ''}
                      onChange={e => update(k, e.target.value)}
                    />
                  </label>
                )
              )}
            </div>

            <h2>Whatnot</h2>

            <div className="grid">
              <label>
                Category
                <input value="Books" disabled />
              </label>

              <label>
                Sub Category
                <select
                  value={form.whatnotSubcategory}
                  onChange={e =>
                    update('whatnotSubcategory', e.target.value)
                  }
                >
                  {WHATNOT_SUBCATEGORIES.map(value => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>

              <label>
                Type
                <input value="Auction" disabled />
              </label>

              <label>
                Whatnot Starting Bid
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.whatnotStartingBid || ''}
                  onChange={e =>
                    update('whatnotStartingBid', e.target.value)
                  }
                />
              </label>

              <label>
                Whatnot Condition
                <select
                  value={form.whatnotCondition}
                  onChange={e =>
                    update('whatnotCondition', e.target.value)
                  }
                >
                  {WHATNOT_CONDITIONS.map(value => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>

              <label>
                Shipping Profile
                <input
                  value={
                    getShippingProfile(form.weight) ||
                    'Auto from Weight'
                  }
                  disabled
                />
              </label>
            </div>

            <button className="primary" type="submit">
  {editingId ? 'Update Book' : 'Save Book'}
</button>
          </form>
        </main>
      )}

      {tab === 'inventory' && (
        <main>
          <section className="card toolbar">
            <input
              placeholder="Search title, author, ISBN, or SKU"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />

            <button onClick={selectAllShown}>
              Select All
            </button>

            <button onClick={exportWhatnotCsv}>
              Export Whatnot CSV ({selected.length})
            </button>

            <button onClick={exportCsv}>
              Export Inventory CSV
            </button>
          </section>

          <section className="list">
            {shown.length === 0 ? (
              <div className="card empty">
                No books saved yet.
              </div>
            ) : (
              shown.map(b => (
                <article className="card book" key={b.id}>
                  <input
                    type="checkbox"
                    checked={selected.includes(b.id)}
                    onChange={() => toggleSelected(b.id)}
                  />

                  <strong>{b.title}</strong>
                  <span>{b.author}</span>

                  <small>
                    {b.sku} · {b.location || 'No location'}
                  </small>

                  <small>
                    Whatnot: {b.whatnotSubcategory || 'Rare & Vintage Books'}
                    {' · '}
                    {b.whatnotCondition || 'Very Good'}
                    {' · '}
                    Auction
                  </small>
            
                  <button type="button" onClick={() => editBook(b)}>Edit</button>
                  <button type="button" onClick={() => deleteBook(b.id)}>Delete</button>
                </article>
              ))
            )}
          </section>
        </main>
      )}

      {tab === 'print' && (
        <main>
          <section className="card print-controls">
            <div>
              <h2>
                {queue.length === 6
                  ? 'Sheet ready'
                  : `${queue.length} of 6 cards ready`}
              </h2>

              <p>
                Print at 100% scale with margins and headers/footers turned off.
              </p>
            </div>

            <div>
              <button
                onClick={printSheet}
                disabled={!queue.length}
              >
                Print Sheet
              </button>

              <button
                className="secondary"
                onClick={clearQueue}
                disabled={!queue.length}
              >
                Clear Queue
              </button>
            </div>
          </section>

          <section className="print-sheet">
            {[0, 1, 2, 3, 4, 5].map(i => {
              const b = queue[i];

              return (
                <div className="inventory-card" key={i}>
                  {b ? (
                    <>
                      <div className="card-head">
                        <strong>{b.sku}</strong>
                        <span>{b.weight || ''}</span>
                      </div>

                      <h3>{b.title}</h3>
                      <div className="author">{b.author}</div>

                      <dl>
                        <div>
                          <dt>Publisher</dt>
                          <dd>{b.publisher}</dd>
                        </div>

                        <div>
                          <dt>Year / Edition</dt>
                          <dd>
                            {[b.year, b.edition]
                              .filter(Boolean)
                              .join(' · ')}
                          </dd>
                        </div>

                        <div>
                          <dt>Binding / Condition</dt>
                          <dd>
                            {[b.binding, b.condition]
                              .filter(Boolean)
                              .join(' — ')}
                          </dd>
                        </div>

                        <div>
                          <dt>ISBN</dt>
                          <dd>{b.isbn}</dd>
                        </div>

                        <div>
                          <dt>Location</dt>
                          <dd>{b.location}</dd>
                        </div>

                        <div>
                          <dt>Purchase / List</dt>
                          <dd>
                            {money(b.purchasePrice)}
                            {b.purchasePrice && b.listingPrice
                              ? ' / '
                              : ''}
                            {money(b.listingPrice)}
                          </dd>
                        </div>
                      </dl>

                      {b.notes && (
                        <p className="notes">{b.notes}</p>
                      )}
                    </>
                  ) : (
                    <span className="blank">Blank card</span>
                  )}
                </div>
              );
            })}
          </section>
        </main>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
