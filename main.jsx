import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const STORAGE_KEY = 'vabulous_inventory_books_v1';
const QUEUE_KEY = 'vabulous_inventory_queue_v1';

const bindingOptions = ['Hardcover','Hardcover with Dust Jacket','Softcover / Paperback','Leather','Bonded Leather','Cloth','Boards','Spiral Bound','Stapled Wraps','Pamphlet','Other'];
const conditionOptions = ['New','As New','Fine','Near Fine','Very Good','Good','Fair','Poor'];
const platformOptions = ['WhatNot','eBay','Depop','Etsy','FBMP','Mercari','Poshmark','Shopify','TikTok','Other'];

const emptyForm = {
  isbn:'', location:'', weightPounds:'', weightOunces:'', title:'', author:'', publisher:'', year:'', edition:'',
  binding:'', condition:'', signed:'', source:'', platforms:[], purchasePrice:'', listingPrice:'', soldPrice:'',
  beginningPhotoNumber:'', endingPhotoNumber:'', dateListed:'', notes:''
};

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function save(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function dateStamp(d = new Date()) {
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
}
function nextSku(books) {
  const prefix = `VB-${dateStamp()}-`;
  const used = books
    .filter(b => b.sku?.startsWith(prefix))
    .map(b => Number(b.sku.slice(-3)))
    .filter(Number.isFinite);
  const next = (used.length ? Math.max(...used) : 0) + 1;
  return `${prefix}${String(next).padStart(3,'0')}`;
}
function money(v){ return v === '' || v == null ? '' : `$${Number(v).toFixed(2)}`; }
function formatWeight(book){
  if (book.weightPounds || book.weightOunces) {
    const parts = [];
    if (book.weightPounds) parts.push(`${book.weightPounds} lb`);
    if (book.weightOunces) parts.push(`${book.weightOunces} oz`);
    return parts.join(' ');
  }
  return book.weight || '';
}
function formatPhotos(book){
  const start = book.beginningPhotoNumber || '';
  const end = book.endingPhotoNumber || '';
  if (start && end) return `${start}–${end}`;
  return start || end;
}
function platformText(value){ return Array.isArray(value) ? value.join(', ') : (value || ''); }

function App() {
  const [books, setBooks] = useState(() => load(STORAGE_KEY, []));
  const [queue, setQueue] = useState(() => load(QUEUE_KEY, []));
  const [tab, setTab] = useState('add');
  const [query, setQuery] = useState('');
  const [form, setForm] = useState(emptyForm);
  const sku = useMemo(() => nextSku(books), [books]);

  const update = (k,v) => setForm(f => ({...f,[k]:v}));
  const togglePlatform = (platform) => setForm(f => ({
    ...f,
    platforms: f.platforms.includes(platform)
      ? f.platforms.filter(p => p !== platform)
      : [...f.platforms, platform]
  }));

  function submit(e){
    e.preventDefault();
    if(!form.title.trim()) return alert('Please enter a title.');
    const book = { ...form, id: crypto.randomUUID(), sku, timestamp: new Date().toISOString() };
    const nextBooks = [book, ...books];
    const nextQueue = [...queue, book].slice(-6);
    setBooks(nextBooks); setQueue(nextQueue);
    save(STORAGE_KEY,nextBooks); save(QUEUE_KEY,nextQueue);
    setForm(emptyForm);
    if(nextQueue.length === 6) setTab('print');
    else alert(`${book.sku} saved. Print queue: ${nextQueue.length} of 6.`);
  }

  function clearQueue(){ setQueue([]); save(QUEUE_KEY,[]); }
  function printSheet(){ window.print(); }
  function exportCsv(){
    const headers = ['TIMESTAMP','SKU','ISBN','LOCATION','TITLE','AUTHOR','PUBLISHER','YEAR','EDITION','CONDITION','BINDING','SIGNED','SOURCE','WEIGHT','DATE LISTED','PLATFORMS','PURCHASE PRICE','LISTING PRICE','SOLD PRICE','DATE SOLD','PROFIT','DAYS TO SELL','BEGINNING PHOTO NUMBER','ENDING PHOTO NUMBER','NOTES'];
    const rows = books.map(b => [b.timestamp,b.sku,b.isbn,b.location,b.title,b.author,b.publisher,b.year,b.edition,b.condition,b.binding,b.signed,b.source,formatWeight(b),b.dateListed,platformText(b.platforms),b.purchasePrice,b.listingPrice,b.soldPrice,'','','',b.beginningPhotoNumber,b.endingPhotoNumber,b.notes]);
    const esc = v => `"${String(v ?? '').replaceAll('"','""')}"`;
    const csv = [headers,...rows].map(r=>r.map(esc).join(',')).join('\n');
    const blob = new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=`vabulous-inventory-${dateStamp()}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  const shown = books.filter(b => `${b.sku} ${b.title} ${b.author} ${b.isbn}`.toLowerCase().includes(query.toLowerCase()));

  return <div className="app">
    <header><div><h1>Vabulous Inventory</h1><p>Book inventory prototype</p></div><div className="badge">Queue {queue.length}/6</div></header>
    <nav>
      <button className={tab==='add'?'active':''} onClick={()=>setTab('add')}>Add Book</button>
      <button className={tab==='inventory'?'active':''} onClick={()=>setTab('inventory')}>Inventory</button>
      <button className={tab==='print'?'active':''} onClick={()=>setTab('print')}>Print Queue</button>
    </nav>

    {tab==='add' && <main>
      <section className="card"><div className="sku"><span>Next SKU</span><strong>{sku}</strong></div></section>
      <form className="card form" onSubmit={submit}>
        <div className="grid">
          <label>ISBN<input value={form.isbn} onChange={e=>update('isbn',e.target.value)} /></label>
          <label>Location<input value={form.location} onChange={e=>update('location',e.target.value)} /></label>

          <fieldset className="wide weight-field"><legend>Weight</legend>
            <label>Pounds<input type="number" min="0" value={form.weightPounds} onChange={e=>update('weightPounds',e.target.value)} /></label>
            <label>Ounces<input type="number" min="0" max="15.99" step="0.1" value={form.weightOunces} onChange={e=>update('weightOunces',e.target.value)} /></label>
          </fieldset>

          <label className="wide">Title *<input value={form.title} onChange={e=>update('title',e.target.value)} /></label>
          <label className="wide">Author<input value={form.author} onChange={e=>update('author',e.target.value)} /></label>
          <label className="wide">Publisher<input value={form.publisher} onChange={e=>update('publisher',e.target.value)} /></label>
          <label>Year<input value={form.year} onChange={e=>update('year',e.target.value)} /></label>
          <label>Edition<input value={form.edition} onChange={e=>update('edition',e.target.value)} /></label>

          <label>Binding<select value={form.binding} onChange={e=>update('binding',e.target.value)}><option value="">Select</option>{bindingOptions.map(v=><option key={v}>{v}</option>)}</select></label>
          <label>Condition<select value={form.condition} onChange={e=>update('condition',e.target.value)}><option value="">Select</option>{conditionOptions.map(v=><option key={v}>{v}</option>)}</select></label>
          <label>Signed<select value={form.signed} onChange={e=>update('signed',e.target.value)}><option value="">Select</option><option>Yes</option><option>No</option></select></label>
          <label>Source<input value={form.source} onChange={e=>update('source',e.target.value)} /></label>

          <fieldset className="wide platforms-field"><legend>Platforms</legend><div className="platform-grid">{platformOptions.map(p=><label className="check-label" key={p}><input type="checkbox" checked={form.platforms.includes(p)} onChange={()=>togglePlatform(p)} />{p}</label>)}</div></fieldset>

          <label>Purchase Price<input type="number" step="0.01" value={form.purchasePrice} onChange={e=>update('purchasePrice',e.target.value)} /></label>
          <label>Listing Price<input type="number" step="0.01" value={form.listingPrice} onChange={e=>update('listingPrice',e.target.value)} /></label>
          <label>Sold Price<input type="number" step="0.01" value={form.soldPrice} onChange={e=>update('soldPrice',e.target.value)} /></label>
          <label>Beginning Photo Number<input value={form.beginningPhotoNumber} onChange={e=>update('beginningPhotoNumber',e.target.value)} /></label>
          <label>Ending Photo Number<input value={form.endingPhotoNumber} onChange={e=>update('endingPhotoNumber',e.target.value)} /></label>
          <label>Date Listed<input type="date" value={form.dateListed} onChange={e=>update('dateListed',e.target.value)} /></label>
          <label className="wide">Notes<textarea value={form.notes} onChange={e=>update('notes',e.target.value)} /></label>
        </div>
        <button className="primary" type="submit">Save Book</button>
      </form>
    </main>}

    {tab==='inventory' && <main>
      <section className="card toolbar"><input placeholder="Search title, author, ISBN, or SKU" value={query} onChange={e=>setQuery(e.target.value)} /><button onClick={exportCsv}>Export CSV</button></section>
      <section className="list">{shown.length===0?<div className="card empty">No books saved yet.</div>:shown.map(b=><article className="card book" key={b.id}><strong>{b.title}</strong><span>{b.author}</span><small>{b.sku} · {b.location || 'No location'}</small></article>)}</section>
    </main>}

    {tab==='print' && <main>
      <section className="card print-controls"><div><h2>{queue.length === 6 ? 'Sheet ready' : `${queue.length} of 6 cards ready`}</h2><p>Print at 100% scale with margins and headers/footers turned off.</p></div><div><button onClick={printSheet} disabled={!queue.length}>Print Sheet</button><button className="secondary" onClick={clearQueue} disabled={!queue.length}>Clear Queue</button></div></section>
      <section className="print-sheet">{[0,1,2,3,4,5].map(i=>{const b=queue[i];return <div className="inventory-card" key={i}>{b? <>
        <div className="card-head"><strong>{b.sku}</strong><span>{formatWeight(b)}</span></div>
        <div className="photo-numbers">Photo Numbers: {formatPhotos(b)}</div>
        <h3>{b.title}</h3><div className="author">{b.author}</div>
        <dl>
          <div><dt>Publisher</dt><dd>{b.publisher}</dd></div>
          <div><dt>Year / Edition</dt><dd>{[b.year,b.edition].filter(Boolean).join(' · ')}</dd></div>
          <div><dt>Binding/Condition</dt><dd>{[b.binding,b.condition].filter(Boolean).join(' — ')}</dd></div>
          <div><dt>Signed</dt><dd>{b.signed}</dd></div>
          <div><dt>Platforms</dt><dd>{platformText(b.platforms)}</dd></div>
          <div><dt>ISBN</dt><dd>{b.isbn}</dd></div>
          <div><dt>Location</dt><dd>{b.location}</dd></div>
          <div><dt>Purchase/List</dt><dd>{money(b.purchasePrice)}{b.purchasePrice&&b.listingPrice?' / ':''}{money(b.listingPrice)}</dd></div>
          <div><dt>Sold Price</dt><dd>{money(b.soldPrice)}</dd></div>
        </dl>
        <p className="notes"><strong>Notes</strong> {b.notes}</p>
      </>:<span className="blank">Blank card</span>}</div>})}</section>
    </main>}
  </div>
}

createRoot(document.getElementById('root')).render(<App/>);
