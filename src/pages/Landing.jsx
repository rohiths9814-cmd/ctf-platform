import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import TopNav from '../components/layout/TopNav';
import Footer from '../components/layout/Footer';

// Competition end = 120 days from a configurable start date
const COMPETITION_DURATION_MS = 120 * 24 * 60 * 60 * 1000;

function getCompetitionEnd() {
  const stored = localStorage.getItem('competition_start');
  if (stored) {
    return new Date(new Date(stored).getTime() + COMPETITION_DURATION_MS);
  }
  const start = new Date();
  localStorage.setItem('competition_start', start.toISOString());
  return new Date(start.getTime() + COMPETITION_DURATION_MS);
}

function useCountdown(targetDate) {
  const [timeLeft, setTimeLeft] = useState(() => {
    const diff = targetDate.getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, mins: 0, secs: 0 };
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      mins: Math.floor((diff / (1000 * 60)) % 60),
      secs: Math.floor((diff / 1000) % 60),
    };
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = targetDate.getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, mins: 0, secs: 0 });
        clearInterval(interval);
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        mins: Math.floor((diff / (1000 * 60)) % 60),
        secs: Math.floor((diff / 1000) % 60),
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
}

export default function Landing() {
  const competitionEnd = useMemo(() => getCompetitionEnd(), []);
  const countdown = useCountdown(competitionEnd);

  const timerCards = [
    { value: String(countdown.days).padStart(2, '0'), label: 'DAYS', icon: 'schedule' },
    { value: String(countdown.hours).padStart(2, '0'), label: 'HOURS', icon: 'hourglass_empty' },
    { value: String(countdown.mins).padStart(2, '0'), label: 'MINS', icon: 'timer' },
    { value: String(countdown.secs).padStart(2, '0'), label: 'SECS', icon: 'bolt' },
  ];

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md overflow-x-hidden">
      <TopNav minimal />
      <Footer />

      <main className="pt-32 pb-16 px-container-padding min-h-screen relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 -z-10 cyber-grid-perspective [transform:rotateX(60deg)] opacity-30 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/10 rounded-full blur-[120px] -z-20" />

        {/* Hero Section */}
        <section className="max-w-6xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-unit px-inner-padding py-2 rounded-full glass-card mb-gutter border-primary-container/30">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="font-mono text-mono text-primary tracking-widest">NETWORK ACCESS: AUTHORIZED</span>
          </div>

          <h1 className="font-h1 text-h1 text-on-surface leading-tight mb-unit">
            WELCOME TO{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
              XYZ_CTF
            </span>
          </h1>

          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto mb-panel-gap opacity-80">
            The next generation of competitive security research. Deconstruct complex architectures, bypass
            high-fidelity firewalls, and secure your legacy.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap justify-center items-center gap-gutter mb-panel-gap">
            <Link
              to="/login"
              className="bg-gradient-to-r from-primary to-secondary text-on-primary font-h3 text-h3 px-12 py-4 rounded-lg shadow-[0_0_20px_rgba(0,105,111,0.3)] hover:scale-105 active:scale-95 transition-all group flex items-center gap-unit"
            >
              <span>ENTER THE GRID</span>
              <span className="material-symbols-outlined group-hover:translate-x-2 transition-transform">
                arrow_forward
              </span>
            </Link>
            <button className="glass-card font-h3 text-h3 px-12 py-4 rounded-lg hover:bg-surface-container/50 transition-all border-outline/20">
              VIEW RULES
            </button>
          </div>

          {/* Countdown Timer */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-unit max-w-4xl mx-auto mb-panel-gap">
            {timerCards.map((item) => (
              <div key={item.label} className="glass-card p-inner-padding rounded-lg relative overflow-hidden group">
                <div className="text-h1 font-h1 text-primary">{item.value}</div>
                <div className="text-label-caps text-on-surface-variant">{item.label}</div>
                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <span className="material-symbols-outlined text-[80px]">{item.icon}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Feature Grid */}
        <section className="max-w-6xl mx-auto mt-container-padding">
          <h2 className="font-h2 text-h2 text-center mb-panel-gap">
            SYSTEM <span className="text-primary">SPECIFICATIONS</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            {/* Large Feature */}
            <div className="md:col-span-2 glass-card rounded-lg p-inner-padding relative overflow-hidden flex flex-col justify-end min-h-[300px] corner-light">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 -z-10" />
              <div className="relative z-10">
                <span className="bg-primary text-on-primary px-3 py-1 rounded-full text-mono text-xs font-bold mb-unit inline-block">
                  CORE MODULE
                </span>
                <h3 className="font-h2 text-h2 mb-2">Dynamic Challenge Network</h3>
                <p className="text-body-lg text-on-surface-variant/80 max-w-lg">
                  Explore challenges across multiple categories in an interactive, interconnected graph. Each solve
                  unlocks new pathways.
                </p>
              </div>
            </div>

            {/* Secondary Feature */}
            <div className="glass-card rounded-lg p-inner-padding flex flex-col justify-center text-center corner-light group">
              <div className="w-16 h-16 bg-primary-container/20 rounded-full flex items-center justify-center mx-auto mb-gutter group-hover:scale-110 transition-transform">
                <span
                  className="material-symbols-outlined text-primary text-[40px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  groups
                </span>
              </div>
              <h3 className="font-h3 text-h3 mb-2">Team-Based Competition</h3>
              <p className="text-on-surface-variant/70">
                Compete in teams of up to 3 members. Coordinate strategies, share knowledge, and climb the
                leaderboard together.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass-card rounded-lg p-inner-padding corner-light">
              <h4 className="text-label-caps text-secondary mb-unit">DURATION</h4>
              <h3 className="font-h3 text-h3 mb-2">120 Day Campaign</h3>
              <p className="text-on-surface-variant/70 text-sm">
                A long-haul competition designed for deep research, skill building, and sustained engagement.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="md:col-span-2 glass-card rounded-lg p-inner-padding flex items-center gap-gutter corner-light overflow-hidden">
              <div className="flex-1">
                <h3 className="font-h2 text-h2 mb-2">Real-Time Leaderboard</h3>
                <p className="text-on-surface-variant/70 mb-gutter">
                  Watch team rankings update live as flags are captured. Track your progress against competitors in
                  real-time.
                </p>
              </div>
              <div className="hidden sm:block w-48 h-48 bg-gradient-to-br from-primary-container/30 to-secondary-container/20 rounded-full blur-3xl" />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
