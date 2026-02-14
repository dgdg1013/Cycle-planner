import { useEffect, useRef, useState } from 'react';

interface TableGridPickerProps {
  onPick: (rows: number, cols: number) => void;
  maxRows?: number;
  maxCols?: number;
}

export function TableGridPicker({ onPick, maxRows = 8, maxCols = 8 }: TableGridPickerProps) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<{ rows: number; cols: number }>({ rows: 2, cols: 2 });
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocMouseDown = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (rootRef.current.contains(event.target as Node)) return;
      setOpen(false);
    };

    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  return (
    <div ref={rootRef} className="table-grid-picker">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
      >
        Table
      </button>

      {open && (
        <div className="table-grid-popover" role="dialog" aria-label="Table size picker">
          <p>{hovered.rows} x {hovered.cols}</p>
          <div className="table-grid-matrix">
            {Array.from({ length: maxRows }).map((_, rowIdx) => (
              <div key={`row-${rowIdx}`} className="table-grid-row">
                {Array.from({ length: maxCols }).map((__, colIdx) => {
                  const row = rowIdx + 1;
                  const col = colIdx + 1;
                  const active = row <= hovered.rows && col <= hovered.cols;

                  return (
                    <button
                      key={`cell-${row}-${col}`}
                      type="button"
                      className={`table-grid-cell ${active ? 'active' : ''}`}
                      onMouseEnter={() => setHovered({ rows: row, cols: col })}
                      onFocus={() => setHovered({ rows: row, cols: col })}
                      onClick={() => {
                        onPick(row, col);
                        setOpen(false);
                      }}
                      aria-label={`${row} rows ${col} columns`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
