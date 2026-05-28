import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function getPages(page, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out = [1];
  if (page > 3)          out.push('…');
  for (let p = Math.max(2, page - 1); p <= Math.min(total - 1, page + 1); p++) out.push(p);
  if (page < total - 2)  out.push('…');
  out.push(total);
  return out;
}

export default function Pagination({ page, setPage, pageCount, from, to, total }) {
  if (!total || pageCount <= 1) return null;
  const pages = getPages(page, pageCount);
  return (
    <div className="pgn-wrap">
      <span className="pgn-info">{from}–{to} of {total}</span>
      <div className="pgn-controls">
        <button className="pgn-btn pgn-arrow" disabled={page === 1} onClick={() => setPage(p => p - 1)} aria-label="Previous">
          <ChevronLeft size={14}/>
        </button>
        {pages.map((p, i) =>
          p === '…'
            ? <span key={`e${i}`} className="pgn-ellipsis">…</span>
            : <button key={p} className={`pgn-btn${page === p ? ' pgn-btn-active' : ''}`} onClick={() => setPage(p)}>{p}</button>
        )}
        <button className="pgn-btn pgn-arrow" disabled={page === pageCount} onClick={() => setPage(p => p + 1)} aria-label="Next">
          <ChevronRight size={14}/>
        </button>
      </div>
    </div>
  );
}
