import { forwardRef } from 'react';

const Input = forwardRef(function Input({ label, className = '', ...props }, ref) {
  const inputId = props.id || props.name;
  return (
    <label htmlFor={inputId} className="block text-sm font-extrabold text-slate-700 dark:text-slate-200">
      {label ? <span>{label}</span> : null}
      <input ref={ref} id={inputId} className={`mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:border-slate-600 dark:focus:border-brand-400 dark:focus:ring-brand-950 dark:disabled:bg-slate-800 ${className}`} {...props} />
    </label>
  );
});

export default Input;
