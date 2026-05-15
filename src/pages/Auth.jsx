import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/layout/Footer';

export default function Auth() {
  const [activeTab, setActiveTab] = useState('login');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [formError, setFormError] = useState('');
  const { login, register, loading, error, clearError } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    clearError();
    setFormError('');
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    // B2: Confirm password validation (register only)
    if (activeTab === 'register') {
      if (formData.password !== formData.confirmPassword) {
        setFormError('Passwords do not match');
        return;
      }
      // B3: Password minimum 8 characters
      if (formData.password.length < 8) {
        setFormError('Password must be at least 8 characters');
        return;
      }
    }

    try {
      if (activeTab === 'login') {
        const user = await login({
          email: formData.email,
          password: formData.password,
        });
        // If user has no team, redirect to team setup
        navigate(user.team_id ? '/dashboard' : '/team-setup');
      } else {
        // B2: Only send username, email, password — NOT confirmPassword
        await register({
          username: formData.username,
          email: formData.email,
          password: formData.password,
        });
        // New users always go to team setup
        navigate('/team-setup');
      }
    } catch {
      // Error handled by AuthContext
    }
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    clearError();
    setFormError('');
    setFormData({ username: '', email: '', password: '', confirmPassword: '' });
  };

  const displayError = formError || error;

  return (
    <div className="bg-background min-h-screen flex flex-col font-body-md text-on-surface overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary-container/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-secondary-container/10 blur-[120px]" />
      </div>

      <main className="flex-grow flex items-center justify-center p-gutter relative">
        <div className="glass-card relative w-full max-w-md rounded-lg p-container-padding flex flex-col gap-unit">
          {/* Corner dots */}
          <div className="absolute top-4 left-4 w-1 h-1 bg-primary-fixed-dim rounded-full" />
          <div className="absolute top-4 right-4 w-1 h-1 bg-primary-fixed-dim rounded-full" />
          <div className="absolute bottom-4 left-4 w-1 h-1 bg-primary-fixed-dim rounded-full" />
          <div className="absolute bottom-4 right-4 w-1 h-1 bg-primary-fixed-dim rounded-full" />

          {/* Header */}
          <div className="text-center mb-8">
            <Link to="/" className="font-h2 text-h2 text-primary tracking-tighter mb-2 inline-block">
              XYZ_CTF
            </Link>
            <div className="inline-block px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
              <p className="font-mono text-mono text-primary uppercase tracking-[0.2em] text-[10px]">
                Authentication Protocol
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-unit mb-6 bg-surface-container/50 p-1 rounded-lg">
            <button
              onClick={() => switchTab('login')}
              className={`flex-1 py-2 font-label-caps text-label-caps rounded-md transition-all ${
                activeTab === 'login'
                  ? 'text-on-primary-container bg-primary-container/40 shadow-sm'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              LOGIN
            </button>
            <button
              onClick={() => switchTab('register')}
              className={`flex-1 py-2 font-label-caps text-label-caps rounded-md transition-all ${
                activeTab === 'register'
                  ? 'text-on-primary-container bg-primary-container/40 shadow-sm'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              REGISTER
            </button>
          </div>

          {/* Error */}
          {displayError && (
            <div className="p-3 bg-error/10 border border-error/30 rounded-lg text-sm text-error font-mono flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">error</span>
              {displayError}
            </div>
          )}

          {/* Form */}
          <form className="flex flex-col gap-unit" onSubmit={handleSubmit}>
            {activeTab === 'register' && (
              <div className="flex flex-col gap-2">
                <label className="font-label-caps text-[10px] text-on-surface-variant/70 ml-2">USERNAME</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-[20px]">
                    person
                  </span>
                  <input
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className="glass-input w-full pl-12 pr-4 py-3 rounded-lg font-mono text-mono placeholder:text-on-surface-variant/30"
                    placeholder="Display name"
                    type="text"
                    required
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="font-label-caps text-[10px] text-on-surface-variant/70 ml-2">EMAIL</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-[20px]">
                  alternate_email
                </span>
                <input
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="glass-input w-full pl-12 pr-4 py-3 rounded-lg font-mono text-mono placeholder:text-on-surface-variant/30"
                  placeholder="you@email.com"
                  type="email"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-2">
              <label className="font-label-caps text-[10px] text-on-surface-variant/70 ml-2">PASSWORD</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-[20px]">
                  lock
                </span>
                <input
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="glass-input w-full pl-12 pr-4 py-3 rounded-lg font-mono text-mono placeholder:text-on-surface-variant/30"
                  placeholder="Min 8 characters"
                  type="password"
                  required
                  minLength={8}
                />
              </div>
            </div>

            {/* B2: Confirm Password (register only) */}
            {activeTab === 'register' && (
              <div className="flex flex-col gap-2">
                <label className="font-label-caps text-[10px] text-on-surface-variant/70 ml-2">CONFIRM PASSWORD</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-[20px]">
                    lock_reset
                  </span>
                  <input
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="glass-input w-full pl-12 pr-4 py-3 rounded-lg font-mono text-mono placeholder:text-on-surface-variant/30"
                    placeholder="Re-enter password"
                    type="password"
                    required
                    minLength={8}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary to-secondary text-white font-label-caps py-4 rounded-lg shadow-lg hover:shadow-[0_0_20px_rgba(0,105,111,0.3)] transition-all active:scale-[0.98] text-center mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  PROCESSING...
                </span>
              ) : activeTab === 'login' ? (
                'LOGIN'
              ) : (
                'CREATE_ACCOUNT'
              )}
            </button>
          </form>
        </div>

        {/* Decorative */}
        <div className="absolute top-1/2 right-gutter -translate-y-1/2 hidden xl:flex flex-col items-center gap-4 opacity-20 pointer-events-none select-none">
          <span className="font-h1 text-[120px] leading-none [writing-mode:vertical-rl] text-primary select-none font-bold tracking-widest">
            XYZ
          </span>
        </div>
      </main>

      <Footer />

      <div className="fixed top-[15%] right-[10%] w-32 h-32 border border-primary/10 rounded-xl rotate-45 -z-10 pointer-events-none" />
      <div className="fixed bottom-[20%] left-[5%] w-64 h-64 border border-secondary/5 rounded-full -z-10 pointer-events-none" />
    </div>
  );
}
