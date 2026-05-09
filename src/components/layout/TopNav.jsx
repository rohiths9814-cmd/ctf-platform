import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const userNavItems = [
  { icon: 'terminal', label: 'Mission Control', path: '/dashboard' },
  { icon: 'security', label: 'Challenges', path: '/challenges' },
  { icon: 'leaderboard', label: 'Leaderboard', path: '/leaderboard' },
  { icon: 'group', label: 'My Team', path: '/team/me' },
];

const adminNavItems = [
  { icon: 'monitoring', label: 'Admin', path: '/admin' },
];

export default function TopNav({ minimal = false }) {
  const location = useLocation();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();

  const navItems = isAdmin ? [...userNavItems, ...adminNavItems] : userNavItems;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-16 bg-surface/60 backdrop-blur-3xl rounded-lg mt-unit mx-gutter px-inner-padding border border-white/20 shadow-xl">
      {/* Brand */}
      <div className="flex items-center gap-3 shrink-0">
        <Link to="/" className="font-h2 text-h2 font-bold tracking-tighter text-primary">
          XYZ_CTF
        </Link>
      </div>

      {/* Center Nav Links */}
      {!minimal && isAuthenticated && (
        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path === '/team/me' && location.pathname.startsWith('/team/'));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-primary-container/30 text-primary shadow-sm'
                    : 'text-on-surface-variant/70 hover:text-primary hover:bg-white/10'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                <span className="hidden lg:inline">{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}

      {minimal && (
        <div className="hidden md:flex items-center gap-1">
          {userNavItems.slice(0, 3).map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`font-h3 text-h3 tracking-widest transition-all px-unit rounded ${
                location.pathname === item.path
                  ? 'text-primary font-bold border-b-2 border-primary-container'
                  : 'text-on-surface-variant font-medium opacity-70 hover:bg-primary-container/10'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}

      {/* Right Section */}
      <div className="flex items-center gap-3 shrink-0">
        {isAuthenticated ? (
          <>
            <button className="p-2 rounded-full hover:bg-primary-container/10 transition-all text-on-surface-variant relative">
              <span className="material-symbols-outlined text-[20px]">notifications</span>
            </button>
            <div className="flex items-center gap-3 pl-3 border-l border-outline-variant/30">
              <div className="w-9 h-9 rounded-full border-2 border-primary/30 bg-primary/10 flex items-center justify-center">
                <span className="font-bold text-primary text-xs">
                  {user?.username?.substring(0, 2).toUpperCase() || '??'}
                </span>
              </div>
              <div className="hidden lg:block">
                <p className="text-sm font-bold text-primary leading-tight">{user?.username || 'UNKNOWN'}</p>
                <p className="text-[9px] font-mono uppercase text-on-surface-variant">
                  {user?.role === 'admin' ? 'ADMIN' : 'OPERATOR'}
                </p>
              </div>
              <button
                onClick={logout}
                className="p-2 rounded-full hover:bg-error/10 transition-all text-on-surface-variant hover:text-error"
                title="Logout"
              >
                <span className="material-symbols-outlined text-sm">logout</span>
              </button>
            </div>
          </>
        ) : (
          <Link
            to="/login"
            className="px-4 py-2 bg-gradient-to-r from-primary to-secondary text-white text-sm font-bold rounded-lg hover:scale-105 transition-all"
          >
            LOGIN
          </Link>
        )}
      </div>
    </nav>
  );
}
