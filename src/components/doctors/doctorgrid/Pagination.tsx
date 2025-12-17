type MessageValues = Record<string, string | number>;

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  tg: (key: string, values?: MessageValues) => string;
}

export const Pagination = ({ currentPage, totalPages, onPageChange, tg }: PaginationProps) => {
  return (
    <div className="col-md-12">
      <nav className="pagination dashboard-pagination mt-4 mb-4" aria-label="Pagination">
        <ul>
          {/* Previous Button */}
          <li>
            <button
              className="page-link prev"
              disabled={currentPage === 1}
              onClick={() => onPageChange(currentPage - 1)}
            >
              {tg('pagination.prev')}
            </button>
          </li>

          {/* Page Numbers */}
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <li key={page}>
              <button
                className={`page-link ${currentPage === page ? 'active' : ''}`}
                onClick={() => onPageChange(page)}
              >
                {page}
              </button>
            </li>
          ))}

          {/* Next Button */}
          <li>
            <button
              className="page-link next"
              disabled={currentPage === totalPages}
              onClick={() => onPageChange(currentPage + 1)}
            >
              {tg('pagination.next')}
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
};

