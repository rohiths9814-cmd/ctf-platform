import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { challengesAPI, activityAPI } from '../api/endpoints';
import { LoadingSpinner, EmptyState, ErrorState } from '../components/ui/StatusStates';

export default function Dashboard() {
  const { user } = useAuth();

  const {
    data: stats,
    loading: statsLoading,
    error: statsError,
    execute: refetchStats,
  } = useApi(() => challengesAPI.getUserStats());

  const {
    data: categoriesData,
    loading: catsLoading,
  } = useApi(() => challengesAPI.getCategories());

  const {
    data: activityData,
    loading: activityLoading,
  } = useApi(() => activityAPI.getGlobal({ limit: 10 }));

  const categories = categoriesData?.categories || [];
  const activities = activityData?.activities || [];

  return (
    <div className="space-y-panel-gap cyber-grid">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-gutter">
        <div>
          <h1 className="font-h1 text-h1 text-primary">{user?.username || 'OPERATOR'}</h1>
          <p className="font-mono text-secondary-container tracking-widest mt-1">
            TEAM: {user?.team_name || 'UNASSIGNED'}
          </p>
        </div>
        <div className="flex gap-4">
          <div className="glass-card p-4 rounded-lg flex items-center gap-4">
            <div className="p-2 bg-primary/10 rounded-md">
              <span className="material-symbols-outlined text-primary">workspace_premium</span>
            </div>
            <div>
              <p className="text-xs font-label-caps opacity-60">TEAM RANK</p>
              <p className="text-xl font-h3 text-primary">
                {statsLoading ? '...' : stats?.rank ? `#${stats.rank}` : '--'}
              </p>
            </div>
          </div>
          <div className="glass-card p-4 rounded-lg flex items-center gap-4">
            <div className="p-2 bg-secondary/10 rounded-md">
              <span className="material-symbols-outlined text-secondary">database</span>
            </div>
            <div>
              <p className="text-xs font-label-caps opacity-60">TOTAL POINTS</p>
              <p className="text-xl font-h3 text-secondary">
                {statsLoading ? '...' : (stats?.total_points || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-gutter">
        {/* Stats Overview */}
        <div className="col-span-12 lg:col-span-8 glass-card rounded-xl p-inner-padding">
          <h3 className="font-h3 text-primary mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined">analytics</span>
            PERFORMANCE_METRICS
          </h3>
          {statsLoading ? (
            <LoadingSpinner text="LOADING STATS..." />
          ) : statsError ? (
            <ErrorState message="Failed to load stats" onRetry={refetchStats} />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-gutter">
              <div className="p-4 bg-surface-container/30 rounded-lg border border-white/20">
                <p className="text-[10px] font-label-caps opacity-50 tracking-wider leading-relaxed">CHALLENGES<br/>SOLVED</p>
                <p className="text-2xl md:text-3xl font-h1 text-primary mt-2">{stats?.solved || 0}</p>
              </div>
              <div className="p-4 bg-surface-container/30 rounded-lg border border-white/20">
                <p className="text-[10px] font-label-caps opacity-50 tracking-wider">SOLVE RATE</p>
                <p className="text-2xl md:text-3xl font-h1 text-secondary mt-2">{stats?.solve_rate || 0}%</p>
              </div>
              <div className="p-4 bg-surface-container/30 rounded-lg border border-white/20">
                <p className="text-[10px] font-label-caps opacity-50 tracking-wider">TOTAL POINTS</p>
                <p className="text-2xl md:text-3xl font-h1 text-tertiary mt-2">{(stats?.total_points || 0).toLocaleString()}</p>
              </div>
              <div className="p-4 bg-surface-container/30 rounded-lg border border-white/20">
                <p className="text-[10px] font-label-caps opacity-50 tracking-wider">TEAM RANK</p>
                <p className="text-2xl md:text-3xl font-h1 text-primary-fixed-dim mt-2">{stats?.rank ? `#${stats.rank}` : '--'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="col-span-12 lg:col-span-4 glass-card rounded-xl p-inner-padding flex flex-col max-h-[450px]">
          <h3 className="font-h3 text-primary mb-gutter flex items-center gap-2">
            <span className="material-symbols-outlined">rss_feed</span>
            GLOBAL_ACTIVITY
          </h3>
          <div className="flex-1 space-y-4 overflow-y-auto pr-2">
            {activityLoading ? (
              <LoadingSpinner text="LOADING FEED..." />
            ) : activities.length === 0 ? (
              <EmptyState icon="rss_feed" title="NO ACTIVITY" message="No solves yet. Be the first!" />
            ) : (
              activities.map((item, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-lg hover:bg-white/40 transition-colors border border-transparent hover:border-white/40">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">
                      <span className="text-primary">{item.username}</span>{' '}
                      solved{' '}
                      <span className="text-secondary font-bold">{item.challenge_title}</span>
                    </p>
                    <p className="text-[10px] font-mono opacity-50">
                      +{item.points} PTS // {new Date(item.solved_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Categories */}
        <div className="col-span-12">
          <h3 className="font-h3 text-primary mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined">category</span>
            CHALLENGE_CATEGORIES
          </h3>
          {catsLoading ? (
            <LoadingSpinner text="LOADING CATEGORIES..." />
          ) : categories.length === 0 ? (
            <EmptyState icon="category" title="NO CATEGORIES" message="No challenges available yet." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
              {categories.map((cat) => {
                const pct = cat.total > 0 ? Math.round((cat.solved / cat.total) * 100) : 0;
                return (
                  <div key={cat.name} className="glass-card p-inner-padding rounded-xl corner-accent relative group hover:-translate-y-1 transition-all">
                    <span className="material-symbols-outlined text-primary text-4xl mb-4">security</span>
                    <h4 className="font-h3 text-lg mb-2 uppercase">{cat.name}</h4>
                    <div className="w-full bg-surface-variant/30 h-1 rounded-full mb-4 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-primary to-primary-container" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between text-xs font-mono opacity-60">
                      <span>{cat.solved}/{cat.total} SOLVED</span>
                      <span>{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
