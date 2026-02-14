import { KeyboardEvent, MouseEvent as ReactMouseEvent, useEffect, useMemo, useRef, useState } from 'react';

interface PrettySelectOption {
  value: string;
  label: string;
}

interface PrettySelectProps {
  value: string;
  options: PrettySelectOption[];
  onChange: (value: string) => void;
  className?: string;
  onTriggerClick?: (event: ReactMouseEvent) => void;
}

export function PrettySelect({ value, options, onChange, className, onTriggerClick }: PrettySelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(() => options.find((option) => option.value === value) ?? options[0], [options, value]);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (rootRef.current.contains(event.target as Node)) return;
      setOpen(false);
    };

    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setOpen((prev) => !prev);
      return;
    }

    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }

    if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      setOpen(true);
      return;
    }

    if (open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      const currentIndex = options.findIndex((option) => option.value === value);
      if (currentIndex < 0) return;
      const nextIndex = event.key === 'ArrowDown'
        ? Math.min(options.length - 1, currentIndex + 1)
        : Math.max(0, currentIndex - 1);
      onChange(options[nextIndex].value);
    }
  };

  return (
    <div ref={rootRef} className={`pretty-select ${open ? 'open' : ''} ${className ?? ''}`.trim()}>
      <button
        type="button"
        className="pretty-select-trigger"
        onClick={(event) => {
          onTriggerClick?.(event);
          setOpen((prev) => !prev);
        }}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{selected?.label ?? ''}</span>
        <span className="pretty-select-arrow" aria-hidden="true">▾</span>
      </button>

      {open && (
        <div className="pretty-select-list" role="listbox">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`pretty-select-item ${option.value === value ? 'selected' : ''}`}
              onClick={(event) => {
                onTriggerClick?.(event);
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
