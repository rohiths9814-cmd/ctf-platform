import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { leaderboardAPI } from '../api/endpoints';
import { LoadingSpinner, EmptyState, ErrorState } from '../components/ui/StatusStates';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, Area, AreaChart,
} from 'recharts';

// Distinct colors for up to 10 teams
const TEAM_COLORS = [
  '#00696F', '#7B5EA7', '#E09100', '#D93F4C', '#2E8B57',
  '#4169E1', '#FF6B6B', '#20B2AA', '#DAA520', '#8B4513',
];

function ScoreChart({ chartData, teams }) {
  const [chartType, setChartType] = useState('area');

  if (!chartData || chartData.length === 0) {
    return (
      <div className="glass-card rounded-xl p-inner-padding">
        <div className="flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-primary">show_chart</span>
          <h3 className="font-h3 text-h3 tracking-tight text-primary">SCORE_TIMELINE</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-on-surface-variant/40">
          <span className="material-symbols-outlined text-[48px] mb-2">timeline</span>
          <p className="font-mono text-sm">No solve data yet</p>
          <p className="text-xs mt-1">Chart will appear once teams start solving challenges</p>
        </div>
      </div>
    );
  }

  // Format time for X axis
  const formatTime = (timeStr) => {
    const d = new Date(timeStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' +
      d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  const formatTimeShort = (timeStr) => {
    const d = new Date(timeStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;
    return (
      <div className="glass-card rounded-lg p-3 shadow-xl border border-white/30 backdrop-blur-xl text-xs">
        <p className="font-mono text-on-surface-variant/60 mb-2">{formatTime(label)}</p>
        <div className="space-y-1">
          {payload
            .filter((p) => p.value > 0)
            .sort((a, b) => b.value - a.value)
            .map((entry, i) => (
              <div key={i} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="font-bold text-on-surface">{entry.name}</span>
                </div>
                <span className="font-mono font-bold" style={{ color: entry.color }}>
                  {entry.value.toLocaleString()} PTS
                </span>
              </div>
            ))}
        </div>
      </div>
    );
  };

  const ChartComponent = chartType === 'area' ? AreaChart : LineChart;

  return (
    <div className="glass-card rounded-xl p-inner-padding relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-[60px] -mr-24 -mt-24 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-secondary/5 rounded-full blur-[40px] -ml-16 -mb-16 pointer-events-none" />

      {/* Header */}
      <div className="relative flex items-center justify-between mb-6 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary">show_chart</span>
          </div>
          <div>
            <h3 className="font-h3 text-h3 tracking-tight text-primary">SCORE_TIMELINE</h3>
            <p className="text-[10px] font-mono text-on-surface-variant/50 uppercase">
              Cumulative points over time • {teams.length} team{teams.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex gap-1 bg-surface-container/50 p-1 rounded-lg">
          <button
            onClick={() => setChartType('area')}
            className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all flex items-center gap-1 ${
              chartType === 'area'
                ? 'bg-primary-container/40 text-primary shadow-sm'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-sm">area_chart</span>
            AREA
          </button>
          <button
            onClick={() => setChartType('line')}
            className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all flex items-center gap-1 ${
              chartType === 'line'
                ? 'bg-primary-container/40 text-primary shadow-sm'
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-sm">timeline</span>
            LINE
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="relative" style={{ height: 350 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ChartComponent data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <defs>
              {teams.map((name, i) => (
                <linearGradient key={name} id={`gradient-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={TEAM_COLORS[i % TEAM_COLORS.length]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={TEAM_COLORS[i % TEAM_COLORS.length]} stopOpacity={0.02} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid
              strokeDasharray="3 6"
              stroke="rgba(255,255,255,0.08)"
              vertical={false}
            />
            <XAxis
              dataKey="time"
              tickFormatter={formatTimeShort}
              tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: 'monospace' }}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontFamily: 'monospace' }}
              axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
              tickLine={false}
              tickFormatter={(v) => `${v}`}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: 16, fontSize: 11 }}
              iconType="circle"
              iconSize={8}
              formatter={(value) => (
                <span style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace', fontSize: 11 }}>
                  {value}
                </span>
              )}
            />
            {teams.map((name, i) =>
              chartType === 'area' ? (
                <Area
                  key={name}
                  type="stepAfter"
                  dataKey={name}
                  stroke={TEAM_COLORS[i % TEAM_COLORS.length]}
                  strokeWidth={2.5}
                  fill={`url(#gradient-${i})`}
                  dot={false}
                  activeDot={{
                    r: 5,
                    strokeWidth: 2,
                    stroke: '#fff',
                    fill: TEAM_COLORS[i % TEAM_COLORS.length],
                  }}
                />
              ) : (
                <Line
                  key={name}
                  type="stepAfter"
                  dataKey={name}
                  stroke={TEAM_COLORS[i % TEAM_COLORS.length]}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{
                    r: 5,
                    strokeWidth: 2,
                    stroke: '#fff',
                    fill: TEAM_COLORS[i % TEAM_COLORS.length],
                  }}
                />
              )
            )}
          </ChartComponent>
        </ResponsiveContainer>
      </div>

      {/* Team score legend cards */}
      {teams.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-white/10">
          {teams.map((name, i) => {
            const lastPoint = chartData[chartData.length - 1];
            const score = lastPoint?.[name] || 0;
            return (
              <div
                key={name}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/5"
              >
                <div
                  className="w-3 h-3 rounded-full shadow-sm"
                  style={{ backgroundColor: TEAM_COLORS[i % TEAM_COLORS.length] }}
                />
                <span className="text-xs font-bold text-on-surface">{name}</span>
                <span
                  className="text-xs font-mono font-bold"
                  style={{ color: TEAM_COLORS[i % TEAM_COLORS.length] }}
                >
                  {score.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Leaderboard() {
  const {
    data: leaderboardData,
    loading,
    error,
    execute: refetch,
  } = useApi(() => leaderboardAPI.getRankings());

  const {
    data: chartRaw,
    loading: chartLoading,
    execute: refetchChart,
  } = useApi(() => leaderboardAPI.getChartData());

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
      refetchChart();
    }, 30000);
    return () => clearInterval(interval);
  }, [refetch, refetchChart]);

  const rankings = leaderboardData?.rankings || [];
  const chartData = chartRaw?.chart || [];
  const chartTeams = chartRaw?.teams || [];
  const top3 = rankings.slice(0, 3);
  const rest = rankings.slice(3);

  // Arrange podium: [2nd, 1st, 3rd]
  const podiumOrder = top3.length >= 3
    ? [top3[1], top3[0], top3[2]]
    : top3.length === 2
    ? [top3[1], top3[0]]
    : top3;

  const podiumConfig = [
    { height: 'h-[280px] mt-8', color: 'secondary', ring: 'border-secondary-fixed-dim', avatarSize: 'w-24 h-24' },
    { height: 'h-[320px] z-10 bg-white/60', color: 'primary', ring: 'border-primary', avatarSize: 'w-32 h-32', crown: true },
    { height: 'h-[280px] mt-8', color: 'tertiary', ring: 'border-tertiary-fixed-dim', avatarSize: 'w-24 h-24' },
  ];

  return (
    <div className="space-y-panel-gap">
      {/* Header */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="font-h1 text-h1 text-primary tracking-widest">RANKINGS</h1>
          <p className="font-mono text-on-surface-variant/60 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse" />
            LIVE TEAM RANKINGS
          </p>
        </div>
        <div className="flex gap-4">
          <div className="glass-card px-inner-padding py-2 rounded-lg text-center border-primary/20">
            <p className="font-label-caps text-label-caps text-outline">TEAMS</p>
            <p className="font-h3 text-h3 text-secondary">{rankings.length}</p>
          </div>
          <div className="glass-card px-inner-padding py-2 rounded-lg text-center border-primary/20">
            <p className="font-label-caps text-label-caps text-outline">MAX MEMBERS</p>
            <p className="font-h3 text-h3 text-primary">3</p>
          </div>
        </div>
      </section>

      {loading ? (
        <LoadingSpinner text="LOADING RANKINGS..." />
      ) : error ? (
        <ErrorState message="Failed to load leaderboard" onRetry={refetch} />
      ) : rankings.length === 0 ? (
        <EmptyState icon="leaderboard" title="NO RANKINGS YET" message="Rankings will appear once teams start solving challenges." />
      ) : (
        <>
          {/* Podium */}
          {top3.length > 0 && (
            <section className={`grid gap-gutter ${podiumOrder.length === 1 ? 'grid-cols-1 max-w-md mx-auto' : podiumOrder.length === 2 ? 'grid-cols-2 max-w-2xl mx-auto' : 'grid-cols-3'}`}>
              {podiumOrder.map((team, idx) => {
                const config = podiumConfig[idx] || podiumConfig[0];
                const rank = rankings.indexOf(team) + 1;
                return (
                  <div
                    key={team.team_id}
                    className={`glass-card podium-glow relative rounded-lg p-inner-padding flex flex-col items-center justify-end ${config.height}`}
                  >
                    {/* Avatar */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                      <div className={`${config.avatarSize} rounded-full border-4 ${config.ring} bg-white shadow-2xl overflow-hidden flex items-center justify-center`}>
                        <span className={`font-h2 text-h2 text-${config.color} font-bold`}>
                          {team.team_name?.substring(0, 2).toUpperCase() || '??'}
                        </span>
                      </div>
                    </div>

                    {/* Crown */}
                    {config.crown && (
                      <div className="absolute -top-12 left-1/2 -translate-x-1/2">
                        <span
                          className="material-symbols-outlined text-tertiary-container text-5xl drop-shadow-[0_0_10px_rgba(254,216,58,0.5)]"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          workspace_premium
                        </span>
                      </div>
                    )}

                    {/* Content */}
                    <div className="text-center w-full mt-12">
                      <span className={`font-mono text-h1 opacity-50 block mb-2`}>
                        {String(rank).padStart(2, '0')}
                      </span>
                      <h3 className="font-h2 text-h2 text-on-surface mb-1 truncate">{team.team_name}</h3>
                      <p className="text-xs font-mono text-on-surface-variant mb-4">
                        {team.member_count || 0}/3 members • {team.solve_count || 0} solves
                      </p>
                      <div className={`rounded-lg p-unit ${
                        rank === 1
                          ? 'bg-primary-container/20 border border-primary/40'
                          : rank === 2
                          ? 'bg-secondary-container/10 border border-secondary-container/20'
                          : 'bg-tertiary-container/10 border border-tertiary-container/20'
                      }`}>
                        <p className={`font-mono font-bold text-${config.color} ${rank === 1 ? 'text-h1' : 'text-h3'}`}>
                          {(team.total_score || 0).toLocaleString()} PTS
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>
          )}

          {/* Score Timeline Chart */}
          <ScoreChart chartData={chartData} teams={chartTeams} />

          {/* Rankings Table */}
          {rest.length > 0 && (
            <section className="glass-card rounded-lg overflow-hidden border-white/30">
              <div className="grid grid-cols-12 gap-gutter px-inner-padding py-4 bg-surface-variant/20 border-b border-white/20">
                <div className="col-span-1 font-label-caps text-label-caps text-outline">RANK</div>
                <div className="col-span-4 font-label-caps text-label-caps text-outline">TEAM</div>
                <div className="col-span-2 font-label-caps text-label-caps text-outline">MEMBERS</div>
                <div className="col-span-2 font-label-caps text-label-caps text-outline">SOLVES</div>
                <div className="col-span-2 font-label-caps text-label-caps text-outline">LAST SOLVE</div>
                <div className="col-span-1 font-label-caps text-label-caps text-outline text-right">SCORE</div>
              </div>
              <div className="divide-y divide-white/10">
                {rest.map((team, idx) => {
                  const rank = idx + 4;
                  return (
                    <div key={team.team_id} className="grid grid-cols-12 gap-gutter px-inner-padding py-5 items-center hover:bg-primary-container/5 transition-all cursor-pointer">
                      <div className="col-span-1">
                        <span className="font-mono text-h3 text-on-surface-variant/40">
                          {String(rank).padStart(2, '0')}
                        </span>
                      </div>
                      <div className="col-span-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center border border-primary/20">
                          <span className="font-bold text-primary text-sm">
                            {team.team_name?.substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-body-md font-bold text-on-surface">{team.team_name}</p>
                        </div>
                      </div>
                      <div className="col-span-2 font-mono text-xs">{team.member_count || 0}/3</div>
                      <div className="col-span-2 font-mono text-xs">{team.solve_count || 0}</div>
                      <div className="col-span-2 font-mono text-xs text-on-surface-variant">
                        {team.last_solve ? new Date(team.last_solve).toLocaleString() : 'N/A'}
                      </div>
                      <div className="col-span-1 font-mono text-right font-bold text-primary">
                        {(team.total_score || 0).toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
