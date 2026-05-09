import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const userNavItems = [
  { icon: 'terminal', label: 'Mission Control', path: '/dashboard' },
  { icon: 'security', label: 'Challenges', path: '/challenges' },
  { icon: 'leaderboard', label: 'Leaderboard', path: '/leaderboard' },
  { icon: 'group', label: 'My Team', path: '/team/me' },
];

const adminNavItems = [
  { icon: 'monitoring', label: 'Admin Panel', path: '/admin' },
];

export default function SideNav() {
  const location = useLocation();
  const { isAdmin } = useAuth();

  const navItems = isAdmin ? [...userNavItems, ...adminNavItems] : userNavItems;

  return (
    <aside className="fixed left-0 top-16 bottom-0 z-40 flex flex-col bg-surface-bright/40 backdrop-blur-2xl rounded-lg ml-gutter my-panel-gap w-64 h-[calc(100vh-80px)] border-r border-white/10 shadow-2xl">
      {/* Header */}
      <div className="p-inner-padding border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center border border-primary/20">
            <span className="material-symbols-outlined text-primary">memory</span>
          </div>
          <div>
            <h3 className="font-h3 text-h3 text-secondary leading-tight">XYZ_OS</h3>
            <p className="text-[10px] font-mono text-on-surface-variant opacity-60">V.1.0.0</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-unit px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path === '/team/me' && location.pathname.startsWith('/team/'));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 py-unit px-inner-padding cursor-pointer transition-all duration-200 ${
                isActive
                  ? 'bg-primary-container/20 text-on-primary-container border-l-4 border-primary rounded-r-full'
                  : 'text-on-surface-variant/80 hover:text-primary hover:bg-surface-variant/30 hover:translate-x-1'
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="font-body-md text-body-md">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* System Diagnostics */}
      <div className="p-4 bg-primary/5 mx-4 mb-4 rounded-lg border border-primary/10">
        <p className="text-[10px] font-mono text-primary uppercase mb-2">System Status</p>
        <div className="w-full h-1 bg-surface-variant rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary to-primary-container w-[78%]" />
        </div>
        <p className="text-[10px] text-on-surface-variant mt-2">Load: Optimal</p>
      </div>

      {/* Footer Links */}
      <div className="p-inner-padding border-t border-white/10 space-y-2">
        <div className="flex items-center gap-3 text-on-surface-variant/60 hover:text-primary text-xs cursor-pointer transition-colors">
          <span className="material-symbols-outlined text-sm">help_center</span>
          <span>Support</span>
        </div>
        <div className="flex items-center gap-3 text-on-surface-variant/60 hover:text-primary text-xs cursor-pointer transition-colors">
          <span className="material-symbols-outlined text-sm">history</span>
          <span>Logs</span>
        </div>
      </div>
    </aside>
  );
}
