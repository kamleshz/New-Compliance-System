import { useEffect, useRef, useState } from 'react';

export function DropdownMenu({ label, align = 'left', children }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const handleMouseDown = (event) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target)) setOpen(false);
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="inline-flex items-center rounded-xl text-sm text-slate-700 transition hover:text-slate-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-100 dark:text-slate-300 dark:hover:text-white dark:focus-visible:ring-brand-950"
      >
        {label}
      </button>
      {open && (
        <div className={`absolute z-30 mt-3 min-w-[240px] origin-top rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-popover backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/95 ${align === 'right' ? 'right-0' : 'left-0'}`}>
          {children}
        </div>
      )}
    </div>
  );
}
