import { useState, useMemo, useEffect } from 'react';

export function usePagination(list, pageSize = 10) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [list]);

  const total = list.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage  = Math.min(page, pageCount);

  const slice = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return list.slice(start, start + pageSize);
  }, [list, safePage, pageSize]);

  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to   = Math.min(safePage * pageSize, total);

  return { page: safePage, setPage, pageCount, slice, from, to, total };
}
