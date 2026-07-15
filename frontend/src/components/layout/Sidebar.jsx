import {
  LuBuilding2 as Building2,
  LuChevronsLeft as ChevronsLeft,
  LuChevronsRight as ChevronsRight,
  LuFileText as FileText,
  LuHouse as Home,
  LuUsers as Users,
  LuWalletCards as WalletCards,
} from 'react-icons/lu';
import { NavLink } from 'react-router-dom';

const menuItems = [
  {
    title: 'Main',
    items: [
      { to: '/', label: 'Dashboard', icon: Home, permission: 'dashboard.read' },
      { to: '/po-dashboard', label: 'PO Dashboard', icon: FileText, permission: 'dashboard.read', nested: true },
      { to: '/account-dashboard', label: 'Account Dashboard', icon: WalletCards, permission: 'dashboard.read', nested: true, accountOnly: true },
    ],
  },
  {
    title: 'User Management',
    adminOnly: true,
    items: [
      { to: '/users', label: 'Admin User Master', icon: Users, permission: ['user.read', 'user_management.read'] },
      { to: '/user-register', label: 'User Register', icon: FileText, permission: ['user.read', 'user_management.read'] },
    ],
  },
  {
    title: 'Organization',
    items: [
      { to: '/clients', label: 'Client Master', icon: Building2, permission: 'compliance.read' },
      { to: '/accounts', label: 'Accounts', icon: WalletCards, accountOnly: true },
    ],
  },
];

function Sidebar({
  open,
  onClose,
  user,
  permissions = [],
  collapsed = false,
  onToggleCollapsed = () => {},
}) {
  const roleName = String(user?.role || user?.roleName || user?.designation || user?.roleId?.roleName || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  const isAdmin = roleName === 'admin' || roleName === 'super admin' || roleName === 'superadmin';
  const isAccount = roleName === 'account' || roleName === 'accounts';
  const hasPermission = (required) => {
    if (!required) return true;
    const requiredPermissions = Array.isArray(required) ? required : [required];
    return requiredPermissions.some((permission) => permissions.includes(permission));
  };

  const visibleSections = menuItems
    .filter((section) => !section.adminOnly || isAdmin)
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => (
        hasPermission(item.permission)
        && (!item.accountOnly || isAccount || isAdmin)
      )),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <aside className={`scrollbar-hidden fixed bottom-0 left-0 top-[61px] z-20 flex w-64 flex-col overflow-y-auto border-r border-[#d3ddd8] bg-[#eef2ee] transition-all duration-300 ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 ${collapsed ? 'px-0 py-0 md:w-[72px]' : 'px-2 py-2 md:w-[260px]'}`}>
      <div className={`flex-1 bg-[#198663] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ${collapsed ? 'flex flex-col items-center px-0 py-3' : 'rounded-[24px] px-3 py-4'}`}>
        <div className={`mb-4 flex items-center ${collapsed ? 'justify-center' : 'justify-between'} gap-2 px-2`}>
          <p className={`text-[11px] font-extrabold uppercase tracking-[0.26em] text-[#9fd8c4] ${collapsed ? 'md:hidden' : ''}`}>Navigation</p>
          <button
            type="button"
            onClick={onToggleCollapsed}
            className={`hidden items-center justify-center bg-[#0e6a4d] text-white shadow-[0_10px_18px_rgba(8,48,35,0.18)] transition hover:bg-[#0b5d44] md:inline-flex ${collapsed ? 'h-11 w-11 rounded-xl' : 'h-10 w-10 rounded-2xl'}`}
            aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          </button>
        </div>

        {visibleSections.map((section) => (
        <div key={section.title} className="mb-7">
          {section.title !== 'Main' ? (
            <p className={`mb-3 px-3 text-[11px] font-extrabold uppercase tracking-[0.24em] text-[#9bd7c1] ${collapsed ? 'md:hidden' : ''}`}>
              {section.title}
            </p>
          ) : null}
          <div className="space-y-1">
            {section.items.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  title={link.label}
                  aria-disabled={link.disabled || undefined}
                  tabIndex={link.disabled ? -1 : undefined}
                  className={({ isActive }) => `group relative flex items-center gap-3 rounded-[16px] px-3 py-3 text-base font-semibold transition ${
                    collapsed
                      ? (isActive
                        ? 'active text-white'
                        : 'text-white/90 hover:text-white')
                      : (isActive
                        ? 'active bg-[#156f50] text-white shadow-[0_8px_18px_rgba(8,48,35,0.14)]'
                        : 'text-white/95 hover:bg-[#1f7f5d] hover:text-white')
                  } ${collapsed ? 'md:mx-auto md:min-h-12 md:w-full md:justify-center md:rounded-none md:px-0 md:py-4' : ''} ${link.nested && !collapsed ? 'ml-7 py-2.5 text-[15px]' : ''}`}
                  onClick={(event) => {
                    if (link.disabled) {
                      event.preventDefault();
                      return;
                    }
                    onClose();
                  }}
                >
                  <span className={`absolute inset-y-2 left-0 w-1 rounded-r-full bg-transparent transition group-[.active]:bg-[#d2ffea] ${collapsed ? 'md:hidden' : ''}`} />
                  <span className={`flex shrink-0 items-center justify-center transition ${collapsed ? 'h-6 w-6 rounded-none bg-transparent text-white/95 group-hover:text-white group-[.active]:bg-transparent group-[.active]:text-white' : link.nested ? 'h-8 w-8 rounded-xl bg-[#137554] text-[#e2f7ed] group-hover:bg-[#166f52] group-[.active]:bg-[#0f6348] group-[.active]:text-white' : 'h-10 w-10 rounded-2xl bg-[#137554] text-[#e2f7ed] group-hover:bg-[#166f52] group-[.active]:bg-[#0f6348] group-[.active]:text-white'}`}>
                    <Icon className={`${collapsed ? 'h-[18px] w-[18px] stroke-[2.2]' : link.nested ? 'h-4 w-4 stroke-[2.1]' : 'h-[18px] w-[18px] stroke-[2.1]'}`} />
                  </span>
                  <span className={`min-w-0 flex-1 leading-tight ${collapsed ? 'md:hidden' : ''}`}>{link.label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
        ))}
      </div>
    </aside>
  );
}

export default Sidebar;
