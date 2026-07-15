function Avatar({ initials, className = '' }) {
  return (
    <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-sm font-black uppercase text-white shadow-sm ring-1 ring-brand-900/10 dark:from-brand-400 dark:to-brand-600 dark:ring-white/10 ${className}`}>{initials || 'U'}</div>
  );
}

export default Avatar;
