function Card({ title, value, children }) {
  return (
    <div className="app-surface-interactive p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white">{value}</p>
        </div>
      </div>
      {children && <div className="mt-4 text-sm text-slate-500 dark:text-slate-400">{children}</div>}
    </div>
  );
}

export default Card;
