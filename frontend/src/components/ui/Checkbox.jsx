function Checkbox({ label, className = '', ...props }) {
  return (
    <label className={`inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 ${className}`}>
      <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-4 focus:ring-brand-100 dark:border-slate-600 dark:bg-slate-900 dark:text-brand-400 dark:focus:ring-brand-950" {...props} />
      {label}
    </label>
  );
}

export default Checkbox;
