import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const STORAGE_KEY = 'vabulous_inventory_books_v1';
const QUEUE_KEY = 'vabulous_inventory_queue_v1';
const PLATFORM_OPTIONS = ['WhatNot', 'eBay', 'Depop', 'Etsy', 'FBMP', 'Mercari', 'Poshmark', 'Shopify', 'TikTok', 'Other'];

const fields = [
  ['isbn', 'ISBN'], ['location', 'Location'], ['__weight__', 'Weight'],
  ['title', 'Title'], ['author', 'Author'], ['publisher', 'Publisher'],
  ['year', 'Year'], ['edition', 'Edition'], ['condition', 'Condition'],
  ['binding', 'Binding'], ['signed', 'Signed'], ['source', 'Source'],
  ['dateListed', 'Date Listed'], ['purchasePrice', 'Purchase Price'],
  ['listingPrice', 'Listing Price'], ['soldPrice', 'Sold Price'],
  ['photoStart', 'Beginning Photo Number'], ['photoEnd', 'Ending Photo Number'],
  ['__platforms__', 'Platforms'], ['notes', 'Notes']
];

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function save(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function dateStamp(d = new Date()) {
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
}
function nextSku(books) {
  const prefix = `VB-${dateStamp()}-`;
  const count = books.filter(b => b.sku?.startsWith(prefix)).length + 1;
  return `${prefix}${String(count).padStart(3,'0')}`;
}
function money(v){ return v !== '' && v != null ? `$${Number(v).toFixed(2)}` : ''; }
function formatWeight(book){
  const pounds = Number(book.weightPounds || 0);
  const ounces = Number(book.weightOunces || 0);
  if(!pounds && !ounces) return '';
  return `${pounds ? `${pounds} lb${pounds === 1 ? '' : 's'}` : ''}${pounds && ounces ? ' ' : ''}${ounces ? `${ounces} oz` : ''}`;
}

function App() {
  const [books, setBooks] = useState(() => load(STORAGE_KEY, []));
  const [queue, setQueue] = useState(() => load(QUEUE_KEY, []));
  const [tab, setTab] = useState('add');
  const [query, setQuery] = useState('');
  const [form, setForm] = useState({ signed:'', condition:'', binding:'', platforms:[], weightPounds:'', weightOunces:'' });
  const sku = useMemo(() => nextSku(books), [books]);

  const update = (k,v) => setForm(f => ({...f,[k]:v}));
  function submit(e){
    e.preventDefault();
    if(!form.title?.trim()) return alert('Please enter a title.');
    const book = { ...form, id: crypto.randomUUID(), sku, timestamp: new Date().toISOString() };
    const nextBooks = [book, ...books];
    const nextQueue = [...queue, book].slice(-6);
    setBooks(nextBooks); setQueue(nextQueue);
    save(STORAGE_KEY,nextBooks); save(QUEUE_KEY,nextQueue);
    setForm({ signed:'', condition:'', binding:'', platforms:[], weightPounds:'', weightOunces:'' });
    if(nextQueue.length === 6) setTab('print');
    else alert(`${book.sku} saved. Print queue: ${nextQueue.length} of 6.`);
  }
  function clearQueue(){ setQueue([]); save(QUEUE_KEY,[]); }
  function printSheet(){ window.print(); }
  function exportCsv(){
    const headers = ['TIMESTAMP','SKU','ISBN','LOCATION','TITLE','AUTHOR','PUBLISHER','YEAR','EDITION','CONDITION','BINDING','SIGNED','SOURCE','WEIGHT','DATE LISTED','PLATFORMS','PURCHASE PRICE','LISTING PRICE','SOLD PRICE','BEGINNING PHOTO NUMBER','ENDING PHOTO NUMBER','DATE SOLD','PROFIT','DAYS TO SELL','NOTES'];
    const rows = books.map(b => [b.timestamp,b.sku,b.isbn,b.location,b.title,b.author,b.publisher,b.year,b.edition,b.condition,b.binding,b.signed,b.source,formatWeight(b),b.dateListed,(b.platforms||[]).join('; '),b.purchasePrice,b.listingPrice,b.soldPrice,b.photoStart,b.photoEnd,'','','','',b.notes]);
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
          {fields.map(([k,label]) =>
            k==='__weight__' ? <fieldset className="wide compact-fieldset" key={k}>
              <legend>{label}</legend>
              <div className="weight-grid">
                <label>Pounds<input type="number" min="0" step="1" value={form.weightPounds||''} onChange={e=>update('weightPounds',e.target.value)} /></label>
                <label>Ounces<input type="number" min="0" max="15" step="1" value={form.weightOunces||''} onChange={e=>update('weightOunces',e.target.value)} /></label>
              </div>
            </fieldset> :
            k==='__platforms__' ? <fieldset className="wide compact-fieldset" key={k}>
              <legend>{label}</legend>
              <div className="platform-checklist">
                {PLATFORM_OPTIONS.map(platform => <label className="check-option" key={platform}>
                  <input type="checkbox" checked={(form.platforms||[]).includes(platform)} onChange={e=>{
                    const current=form.platforms||[];
                    update('platforms', e.target.checked ? [...current,platform] : current.filter(p=>p!==platform));
                  }} />
                  <span>{platform}</span>
                </label>)}
              </div>
            </fieldset> :
            k==='notes' ? <label className="wide" key={k}>{label}<textarea value={form[k]||''} onChange={e=>update(k,e.target.value)} /></label> :
            k==='signed' ? <label key={k}>{label}<select value={form[k]||''} onChange={e=>update(k,e.target.value)}><option value="">Select</option><option>Yes</option><option>No</option></select></label> :
            k==='condition' ? <label key={k}>{label}<select value={form[k]||''} onChange={e=>update(k,e.target.value)}>
              <option value="">Select condition</option>
              <option>New</option><option>As New</option><option>Fine</option><option>Near Fine</option>
              <option>Very Good</option><option>Good</option><option>Fair</option><option>Poor</option>
            </select></label> :
            k==='binding' ? <label key={k}>{label}<select value={form[k]||''} onChange={e=>update(k,e.target.value)}>
              <option value="">Select binding</option>
              <option>Hardcover</option><option>Hardcover with Dust Jacket</option><option>Softcover / Paperback</option>
              <option>Leather</option><option>Bonded Leather</option><option>Cloth</option><option>Boards</option>
              <option>Spiral Bound</option><option>Stapled Wraps</option><option>Pamphlet</option><option>Other</option>
            </select></label> :
            <label className={['title','author','publisher'].includes(k)?'wide':''} key={k}>{label}{k==='title' && ' *'}<input type={['purchasePrice','listingPrice','soldPrice','photoStart','photoEnd'].includes(k)?'number':k==='dateListed'?'date':'text'} step={['purchasePrice','listingPrice','soldPrice'].includes(k)?'0.01':'1'} value={form[k]||''} onChange={e=>update(k,e.target.value)} /></label>
          )}
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
      <section className="print-sheet">{[0,1,2,3,4,5].map(i=>{const b=queue[i];return <div className="inventory-card" key={i}>{b?<>
        <div className="card-head"><strong>{b.sku}</strong><span>{formatWeight(b)}</span></div>
        <h3>{b.title}</h3><div className="author">{b.author}</div>
        <dl>
          <div><dt>Publisher</dt><dd>{b.publisher}</dd></div>
          <div><dt>Year / Edition</dt><dd>{[b.year,b.edition].filter(Boolean).join(' · ')}</dd></div>
          <div><dt>Binding/Condition</dt><dd>{[b.binding,b.condition].filter(Boolean).join(' — ')}</dd></div>
          <div><dt>ISBN</dt><dd>{b.isbn}</dd></div>
          <div><dt>Location</dt><dd>{b.location}</dd></div>
          <div><dt>Purchase / List</dt><dd>{money(b.purchasePrice)} {b.purchasePrice&&b.listingPrice?' / ':''}{money(b.listingPrice)}</dd></div>
          <div><dt>Sold Price</dt><dd>{money(b.soldPrice)}</dd></div>
          <div><dt>Photo Numbers</dt><dd>{[b.photoStart,b.photoEnd].filter(v=>v!==''&&v!=null).join('–')}</dd></div>
        </dl>
        {b.notes && <p className="notes">{b.notes}</p>}
      </>:<span className="blank">Blank card</span>}</div>})}</section>
    </main>}
  </div>
}

createRoot(document.getElementById('root')).render(<App/>);
