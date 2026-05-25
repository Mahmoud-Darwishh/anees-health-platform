import type { ReactNode } from 'react';

type PortalDataTableProps = {
  headers: string[];
  rows: ReactNode[][];
  emptyText: string;
  wrapperClassName?: string;
  tableClassName?: string;
};

export function PortalDataTable({
  headers,
  rows,
  emptyText,
  wrapperClassName,
  tableClassName,
}: PortalDataTableProps) {
  if (rows.length === 0) {
    return <p>{emptyText}</p>;
  }

  return (
    <div className={wrapperClassName}>
      <table className={tableClassName}>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`}>
              {row.map((cell, cellIndex) => (
                <td key={`cell-${rowIndex}-${cellIndex}`} data-label={headers[cellIndex] ?? ''}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
