import React, { useMemo } from 'react';

export interface TableColumn<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
}

export interface TableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  striped?: boolean;
  hoverable?: boolean;
  /** Optional unique key extractor for row optimization */
  getRowKey?: (item: T, index: number) => string | number;
}

function TableComponent<T extends Record<string, any>>({
  data,
  columns,
  striped = false,
  hoverable = false,
  getRowKey = (_, index) => index,
}: TableProps<T>) {
  // Memoize table styles for performance
  const tableContainerStyle = useMemo(
    () => ({ overflowX: 'auto' as const }),
    []
  );

  const tableStyle = useMemo(
    () => ({
      width: '100%',
      borderCollapse: 'collapse' as const,
      fontSize: '0.875rem',
    }),
    []
  );
  return (
    <div style={tableContainerStyle}>
      <table role="table" style={tableStyle}>
        <thead>
          <tr
            style={{
              borderBottom: '2px solid #e5e7eb',
              backgroundColor: '#f9fafb',
            }}
          >
            {columns.map((column) => (
              <th
                key={column.key}
                style={{
                  padding: '0.75rem 1rem',
                  textAlign: 'left',
                  fontWeight: 600,
                  color: '#374151',
                }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr
              key={getRowKey(item, index)}
              style={{
                borderBottom: '1px solid #e5e7eb',
                backgroundColor:
                  striped && index % 2 === 1 ? '#f9fafb' : 'transparent',
              }}
              onMouseEnter={(e) => {
                if (hoverable) {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                }
              }}
              onMouseLeave={(e) => {
                if (hoverable) {
                  e.currentTarget.style.backgroundColor =
                    striped && index % 2 === 1 ? '#f9fafb' : 'transparent';
                }
              }}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  style={{
                    padding: '0.75rem 1rem',
                    color: '#1f2937',
                  }}
                >
                  {column.render ? column.render(item) : item[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Memoize component to prevent unnecessary re-renders
export const Table = React.memo(TableComponent) as typeof TableComponent;
