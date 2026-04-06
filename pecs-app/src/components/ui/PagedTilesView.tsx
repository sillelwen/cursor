import React, { useState } from "react";

export interface PagedTilesViewProps<T> {
  allItems: T[];
  itemsPerPage?: number;
  className?: string;
  renderItem?: (item: T) => React.ReactNode;
  getKey?: (item: T, index: number) => React.Key;
}

export function PagedTilesView<T>({
  allItems,
  itemsPerPage = 12,
  className = '',
  renderItem,
  getKey,
}: PagedTilesViewProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(allItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = allItems.slice(startIndex, endIndex);

  const handlePageChange = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  // default render function
  const defaultRenderItem = (item: T) => (
    <div className="tile-item">
      <pre>{JSON.stringify(item, null, 2)}</pre>
    </div>
  );

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const delta = 2; // сколько страниц вокруг текущей

    const range = [];
    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      range.unshift("…");
    }
    if (currentPage + delta < totalPages - 1) {
      range.push("…");
    }

    if (totalPages >= 1) {
      pages.push(1);
    }
    pages.push(...range);
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className={className}>
      <div className="tile-grid-container">
        {currentItems.map((item, index) => (
          <div key={getKey ? getKey(item, index) : index} className="tile-grid-item">
            {(renderItem ?? defaultRenderItem)(item)}
          </div>
        ))}
      </div>
      <div className="pagination-controls">
        {currentPage>1 &&
        <>
          <button onClick={() => handlePageChange(1)}>
            &laquo;
          </button>
          <button onClick={() => handlePageChange(currentPage - 1)}>
            &lt;
          </button>
        </>}

        {getPageNumbers().map((p, idx) =>
          typeof p === "number" ? (
            <button
              key={idx}
              onClick={() => handlePageChange(p)}
              disabled={currentPage === p}
            >
              {p}
            </button>
          ) : (
            <span key={idx} className="pagination-ellipsis">
              {p}
            </span>
          )
        )}
        {currentPage<totalPages &&
        <>
          <button onClick={() => handlePageChange(currentPage + 1)}>
            &gt;
          </button>
          <button onClick={() => handlePageChange(totalPages)}>
            &raquo;
          </button>
        </>}
      </div>
    </div>
  );
}