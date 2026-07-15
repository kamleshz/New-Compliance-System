import {
  FiBell as Bell,
  FiChevronDown as ChevronDown,
  FiLogOut as LogOut,
  FiMenu as Menu,
  FiSearch as Search,
  FiSettings as Settings,
  FiShield as ShieldCheck,
} from 'react-icons/fi';
import { DropdownMenu } from '../ui/DropdownMenu.jsx';
import Avatar from '../ui/Avatar.jsx';

function Topbar({ breadcrumbs, user, onLogout, onMenuOpen }) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#d9e7de] bg-[#f8fbf9]/95 shadow-sm backdrop-blur-xl">
      <div className="flex w-full items-center justify-between gap-4 px-4 py-2.5 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={onMenuOpen} className="focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d9e7de] bg-white text-[#2f5f4b] shadow-sm md:hidden" aria-label="Open navigation menu">
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#0f7b59] text-white shadow-[0_10px_24px_rgba(15,123,89,0.22)] sm:flex">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="min-w-0 rounded-2xl border border-[#dce9e1] bg-white px-4 py-2.5 shadow-sm">
            <p className="truncate text-[13px] font-black uppercase tracking-[0.14em] text-[#243247]">
              Compliance System
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden h-10 items-center gap-3 rounded-xl border border-[#d9e7de] bg-white px-3 text-slate-500 transition focus-within:border-[#8dc6ae] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#e4f2eb] md:flex">
            <Search className="h-4 w-4 text-slate-400" />
            <input aria-label="Search workspace" placeholder="Search workspace" className="w-48 bg-transparent text-sm font-medium outline-none placeholder:text-slate-400 lg:w-72" />
          </div>
          <DropdownMenu label={
            <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#d9e7de] bg-white text-slate-600 shadow-sm transition hover:border-[#b8d8c7] hover:bg-[#edf6f1] hover:text-[#136f52]">
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-white" />
            </span>
          } align="right">
            <div className="w-72 space-y-3 p-4">
              <p className="text-sm font-extrabold text-slate-950 dark:text-white">Notifications</p>
              <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <div className="rounded-xl bg-brand-50 p-3 font-semibold text-brand-800 ring-1 ring-brand-100 dark:bg-brand-950/50 dark:text-brand-200 dark:ring-brand-900">New compliance task assigned.</div>
                <div className="rounded-lg bg-slate-50 p-3 font-semibold dark:bg-slate-900">Policy review due in 3 days.</div>
              </div>
            </div>
          </DropdownMenu>
          <DropdownMenu label={
            <span className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#d9e7de] bg-white px-2.5 text-sm font-extrabold text-slate-700 shadow-sm transition hover:border-[#b8d8c7] hover:bg-[#edf6f1]">
              <Avatar initials={user?.name?.split(' ').map((n) => n[0]).join('')} />
              <span className="hidden max-w-32 truncate sm:inline">{user?.name || 'Admin'}</span>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </span>
          } align="right">
            <div className="w-64 space-y-3 p-4 text-sm text-slate-700 dark:text-slate-200">
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900">
                <p className="font-extrabold text-slate-950 dark:text-white">{user?.name || 'Compliance Admin'}</p>
                <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{user?.role || 'Administrator'}</p>
              </div>
              <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
                <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left font-bold transition hover:bg-slate-100 dark:hover:bg-slate-900"><Settings className="h-4 w-4" /> Settings</button>
                <button type="button" onClick={onLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left font-bold text-rose-600 transition hover:bg-rose-100 dark:text-rose-300 dark:hover:bg-slate-900"><LogOut className="h-4 w-4" /> Sign out</button>
              </div>
            </div>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

export default Topbar;
