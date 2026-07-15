function Button({ children, variant = 'primary', className = '', ...props }) {
  const styles = {
    primary: 'admin-primary-button justify-center px-5 py-3',
    secondary: 'admin-secondary-button justify-center px-5 py-3',
    danger: 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-rose-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-200 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 dark:focus-visible:ring-rose-950',
    ghost: 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-extrabold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white dark:focus-visible:ring-slate-800',
  };

  return (
    <button className={`${styles[variant] || styles.primary} ${className}`} {...props}>
      {children}
    </button>
  );
}

export default Button;
