function Table({ columns = [], data = [], emptyMessage = 'No records found.' }) {
  const getValue = (row, accessor) => {
    if (!accessor) return '';
    const keys = accessor.split('.');
    let value = row;
    for (const key of keys) {
      value = value?.[key];
    }
    return value;
  };

  return (
    <div className="app-surface overflow-hidden">
      <div className="overflow-x-auto">
      <table className="min-w-[720px] w-full text-left">
        <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500 backdrop-blur dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-400">
          <tr>
            {columns.map((column) => (
              <th key={column.accessor} className="px-5 py-3.5">{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white/50 text-sm dark:divide-slate-800 dark:bg-slate-900/40">
          {data.length ? data.map((row, rowIndex) => (
            <tr key={row.id ?? rowIndex} className="transition hover:bg-slate-50/70 even:bg-slate-50/30 dark:hover:bg-slate-800/60 dark:even:bg-slate-950/20">
              {columns.map((column) => {
                const value = getValue(row, column.accessor);
                const displayValue = column.render ? column.render(value) : value;
                return (
                  <td key={column.accessor} className="px-5 py-4 font-semibold text-slate-700 dark:text-slate-200">
                    {displayValue}
                  </td>
                );
              })}
            </tr>
          )) : (
            <tr>
              <td colSpan={columns.length || 1} className="px-5 py-12 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}

export default Table;
