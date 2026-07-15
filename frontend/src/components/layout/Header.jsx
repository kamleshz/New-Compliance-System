import { FiMenu as Menu, FiMoon as Moon, FiSun as Sun } from 'react-icons/fi';
import { useState } from 'react';

function Header({ onToggle }) {
  const [dark, setDark] = useState(false);

  const handleTheme = () => {
    const root = document.documentElement;
    root.classList.toggle('dark');
    setDark((prev) => !prev);
  };

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-4 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-950 md:px-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onToggle} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Welcome back,</p>
            <h2 className="text-xl font-semibold">Compliance administrator</h2>
          </div>
        </div>
        <button onClick={handleTheme} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </div>
    </header>
  );
}

export default Header;
