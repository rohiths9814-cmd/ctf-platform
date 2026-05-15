import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { leaderboardAPI } from '../api/endpoints';
import { LoadingSpinner, EmptyState, ErrorState } from '../components/ui/StatusStates';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts';

// Distinct colors matching CTFd style
const TEAM_COLORS = [
  '#FF6384', '#4169E1', '#9ACD32', '#9932CC', '#20B2AA',
  '#FF4500', '#FF69B4', '#FFD700', '#00CED1', '#2E8B57',
];

function ScoreChart({ chartData, teams, rankings }) {
  if (!chartData || chartData.length === 0) {
    return (
      <div className="bg-white/95 rounded-xl p-8 shadow-sm border border-gray-200">
        <h3 className="text-center text-xl font-semibold text-gray-800 mb-6">Top 10 Teams</h3>
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <span className="material-symbols-outlined text-[48px] mb-2">timeline</span>
          <p className="text-sm font-medium">No solve data yet</p>
          <p className="text-xs mt-1 text-gray-400">Chart will appear once teams start solving challenges</p>
        </div>
      </div>
    );
  }

  // Format time for X axis — show time + date like CTFd
  const formatXAxis = (timeStr) => {
    const d = new Date(timeStr);
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  const formatXAxisDate = (timeStr) => {
    const d = new Date(timeStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;
    const d = new Date(label);
    const timeLabel = d.toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    return (
      <div className="bg-white rounded-lg p-3 shadow-lg border border-gray-200 text-xs">
        <p className="font-medium text-gray-600 mb-2">{timeLabel}</p>
        <div className="space-y-1">
          {payload
            .filter((p) => p.value > 0)
            .sort((a, b) => b.value - a.value)
            .map((entry, i) => (
              <div key={i} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-gray-800 font-medium">{entry.name}</span>
                </div>
                <span className="font-mono font-bold" style={{ color: entry.color }}>
                  {entry.value.toLocaleString()}
                </span>
              </div>
            ))}
        </div>
      </div>
    );
  };

  // Build the table data — sorted by score descending
  const tableData = (rankings || [])
    .slice(0, 10)
    .map((team, idx) => ({
      place: idx + 1,
      name: team.team_name,
      score: team.total_score || 0,
      color: TEAM_COLORS[idx % TEAM_COLORS.length],
    }));

  return (
    <div className="space-y-6">
      {/* Chart Card — CTFd-style clean white */}
      <div className="bg-white/95 rounded-xl p-6 md:p-8 shadow-sm border border-gray-200">
        <h3 className="text-center text-xl font-semibold text-gray-800 mb-6">Top 10 Teams</h3>

        <div style={{ height: 380 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 30 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(0,0,0,0.08)"
                vertical={true}
              />
              <XAxis
                dataKey="time"
                tickFormatter={formatXAxis}
                tick={{ fill: '#666', fontSize: 11 }}
                axisLine={{ stroke: '#ccc' }}
                tickLine={{ stroke: '#ccc' }}
                interval="preserveStartEnd"
                label={{
                  value: chartData.length > 0 ? formatXAxisDate(chartData[0].time) : '',
                  position: 'insideBottomLeft',
                  offset: -20,
                  style: { fill: '#999', fontSize: 11 },
                }}
              />
              <YAxis
                tick={{ fill: '#666', fontSize: 11 }}
                axisLine={{ stroke: '#ccc' }}
                tickLine={{ stroke: '#ccc' }}
                tickFormatter={(v) => v.toLocaleString()}
                width={55}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: 12, fontSize: 12 }}
                iconType="plainline"
                iconSize={18}
                formatter={(value) => (
                  <span style={{ color: '#555', fontSize: 12 }}>{value}</span>
                )}
              />
              {teams.slice(0, 10).map((name, i) => (
                <Line
                  key={name}
                  type="linear"
                  dataKey={name}
                  stroke={TEAM_COLORS[i % TEAM_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3, fill: TEAM_COLORS[i % TEAM_COLORS.length], strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff', fill: TEAM_COLORS[i % TEAM_COLORS.length] }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Score Table — CTFd-style Place / Team / Score */}
      {tableData.length > 0 && (
        <div className="bg-white/95 rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200">
            <div className="col-span-2 text-sm font-semibold text-gray-600">Place</div>
            <div className="col-span-6 text-sm font-semibold text-gray-600">Team</div>
            <div className="col-span-4 text-sm font-semibold text-gray-600 text-right">Score</div>
          </div>
          {/* Table Rows */}
          <div className="divide-y divide-gray-100">
            {tableData.map((row) => (
              <div
                key={row.place}
                className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-gray-50/80 transition-colors"
              >
                <div className="col-span-2">
                  <span className="text-sm font-medium text-gray-700">{row.place}</span>
                </div>
                <div className="col-span-6">
                  <span className="text-sm font-medium" style={{ color: row.color }}>
                    {row.name}
                  </span>
                </div>
                <div className="col-span-4 text-right">
                  <span className="text-sm font-semibold text-gray-800">
                    {row.score.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
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
            <section className={`grid gap-gutter pt-20 overflow-visible ${podiumOrder.length === 1 ? 'grid-cols-1 max-w-md mx-auto' : podiumOrder.length === 2 ? 'grid-cols-2 max-w-2xl mx-auto' : 'grid-cols-3'}`}>
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
          <ScoreChart chartData={chartData} teams={chartTeams} rankings={rankings} />

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
