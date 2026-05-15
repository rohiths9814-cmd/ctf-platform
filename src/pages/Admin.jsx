import { useState } from 'react';
import { useApi, useMutation } from '../hooks/useApi';
import { adminChallengesAPI, adminUsersAPI, announcementsAPI } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner, EmptyState, ErrorState } from '../components/ui/StatusStates';

export default function Admin() {
  const { user: currentUser } = useAuth();
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newChallenge, setNewChallenge] = useState({
    title: '', description: '', category: '', difficulty: 1, points: 100, flag: '', status: 'active',
  });
  const [announcementText, setAnnouncementText] = useState('');

  // Fetch data from API
  const {
    data: statsData,
    loading: statsLoading,
    error: statsError,
    execute: refetchStats,
  } = useApi(() => adminChallengesAPI.getStats());

  const {
    data: challengesData,
    loading: challengesLoading,
    execute: refetchChallenges,
  } = useApi(() => adminChallengesAPI.getAll());

  const {
    data: announcementsData,
    loading: announcementsLoading,
    execute: refetchAnnouncements,
  } = useApi(() => announcementsAPI.getAll());

  const {
    data: usersData,
    loading: usersLoading,
    execute: refetchUsers,
  } = useApi(() => adminUsersAPI.getAll());

  const { mutate: createChallenge, loading: creating } = useMutation(
    (data) => adminChallengesAPI.create(data)
  );
  const { mutate: deleteChallenge } = useMutation(
    (id) => adminChallengesAPI.delete(id)
  );
  const { mutate: createAnnouncement } = useMutation(
    (data) => announcementsAPI.create(data)
  );

  const {
    data: joinRequestsData,
    loading: joinRequestsLoading,
  } = useApi(() => adminChallengesAPI.getJoinRequests());

  const {
    data: health,
    loading: healthLoading,
    execute: refetchHealth,
  } = useApi(() => adminChallengesAPI.getHealth());

  const stats = statsData || {};
  const challenges = challengesData?.challenges || [];
  const announcements = announcementsData?.announcements || [];
  const users = usersData?.users || [];
  const joinRequests = joinRequestsData?.requests || [];

  // Format seconds into human readable uptime
  const formatUptime = (seconds) => {
    if (!seconds) return '0s';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const filteredChallenges = activeFilter === 'ALL'
    ? challenges
    : challenges.filter((c) => c.category === activeFilter);

  // Get unique categories from challenges
  const allCategories = ['ALL', ...new Set(challenges.map((c) => c.category).filter(Boolean))];

  const handleCreateChallenge = async (e) => {
    e.preventDefault();
    try {
      await createChallenge(newChallenge);
      setShowCreateModal(false);
      setNewChallenge({ title: '', description: '', category: '', difficulty: 1, points: 100, flag: '', status: 'active' });
      refetchChallenges();
    } catch { /* error shown in UI */ }
  };

  const handleDeleteChallenge = async (id) => {
    if (!confirm('Delete this challenge?')) return;
    try {
      await deleteChallenge(id);
      refetchChallenges();
    } catch { /* error shown in UI */ }
  };

  const handleSendAnnouncement = async () => {
    if (!announcementText.trim()) return;
    try {
      await createAnnouncement({ message: announcementText, type: 'broadcast' });
      setAnnouncementText('');
      refetchAnnouncements();
    } catch { /* error shown in UI */ }
  };

  const handleToggleRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!confirm(`${newRole === 'admin' ? 'Promote' : 'Demote'} this user?`)) return;
    try {
      await adminUsersAPI.updateRole(userId, newRole);
      refetchUsers();
      refetchStats();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update role');
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!confirm(`Delete user "${username}"? This will also delete all their solves.`)) return;
    try {
      await adminUsersAPI.delete(userId);
      refetchUsers();
      refetchStats();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete user');
    }
  };

  return (
    <div className="space-y-panel-gap">
      {/* Header */}
      <header className="flex justify-between items-end mb-panel-gap">
        <div>
          <h1 className="font-h1 text-h1 text-primary">MISSION CONTROL</h1>
          <p className="font-mono text-on-surface-variant opacity-70 mt-2">
            // SYSTEM STATUS: NOMINAL // TOTAL USERS: {stats.total_users || 0}
          </p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white font-bold rounded-full shadow-lg hover:scale-105 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined">add</span>
            NEW_CHALLENGE
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-unit">
        {[
          { label: 'TOTAL TEAMS', value: stats.total_teams, icon: 'groups', color: 'primary' },
          { label: 'TOTAL USERS', value: stats.total_users, icon: 'person', color: 'secondary' },
          { label: 'CHALLENGES', value: stats.total_challenges, icon: 'security', color: 'tertiary' },
          { label: 'TOTAL SOLVES', value: stats.total_solves, icon: 'check_circle', color: 'primary-fixed-dim' },
        ].map((item) => (
          <div key={item.label} className="glass-panel p-inner-padding rounded-lg flex flex-col justify-center items-center text-center">
            <span className={`material-symbols-outlined text-${item.color} mb-2`}>{item.icon}</span>
            <h4 className={`text-2xl font-h2 text-${item.color}`}>
              {statsLoading ? '...' : item.value ?? '--'}
            </h4>
            <p className="text-[10px] font-label-caps text-on-surface-variant opacity-60">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Challenge Table */}
      <div className="glass-panel rounded-lg overflow-hidden">
        <div className="p-inner-padding border-b border-white/20 flex justify-between items-center bg-white/10">
          <h3 className="font-h3 text-h3 text-primary">CHALLENGE_FLEET</h3>
          <div className="flex gap-2 flex-wrap">
            {allCategories.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`p-1 px-3 text-[10px] font-bold rounded ${
                  activeFilter === f
                    ? 'bg-primary text-white'
                    : 'text-on-surface-variant border border-outline-variant'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {challengesLoading ? (
          <LoadingSpinner text="LOADING CHALLENGES..." />
        ) : filteredChallenges.length === 0 ? (
          <EmptyState icon="security" title="NO CHALLENGES" message="Create your first challenge to get started." />
        ) : (
          <table className="w-full text-left">
            <thead className="bg-surface-container-low">
              <tr className="text-label-caps text-[10px] text-on-surface-variant/70">
                <th className="px-inner-padding py-3">ID</th>
                <th className="px-inner-padding py-3">CHALLENGE NAME</th>
                <th className="px-inner-padding py-3">CATEGORY</th>
                <th className="px-inner-padding py-3">DIFFICULTY</th>
                <th className="px-inner-padding py-3">POINTS</th>
                <th className="px-inner-padding py-3">SOLVES</th>
                <th className="px-inner-padding py-3">STATUS</th>
                <th className="px-inner-padding py-3">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {filteredChallenges.map((ch) => (
                <tr key={ch.id} className="hover:bg-white/20 transition-colors group">
                  <td className="px-inner-padding py-4 font-mono text-xs opacity-50">#{ch.id}</td>
                  <td className="px-inner-padding py-4 font-bold text-primary">{ch.title}</td>
                  <td className="px-inner-padding py-4 text-xs font-mono">{ch.category}</td>
                  <td className="px-inner-padding py-4">
                    <div className="flex gap-1">
                      {[1, 2, 3].map((d) => (
                        <span
                          key={d}
                          className={`w-2 h-2 rounded-full ${d <= ch.difficulty ? 'bg-primary' : 'bg-surface-variant'}`}
                        />
                      ))}
                    </div>
                  </td>
                  <td className="px-inner-padding py-4 font-mono text-xs">{ch.points}</td>
                  <td className="px-inner-padding py-4 font-mono text-xs">{ch.solve_count || 0}</td>
                  <td className="px-inner-padding py-4">
                    <span
                      className={`px-2 py-1 text-[10px] font-bold rounded-full ${
                        ch.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : ch.status === 'maintenance'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {ch.status?.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-inner-padding py-4">
                    <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="material-symbols-outlined text-sm cursor-pointer hover:text-primary">edit</span>
                      <span
                        className="material-symbols-outlined text-sm cursor-pointer hover:text-error"
                        onClick={() => handleDeleteChallenge(ch.id)}
                      >
                        delete
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* User Management */}
      <div className="glass-panel rounded-lg overflow-hidden">
        <div className="p-inner-padding border-b border-white/20 flex justify-between items-center bg-white/10">
          <h3 className="font-h3 text-h3 text-secondary flex items-center gap-2">
            <span className="material-symbols-outlined">manage_accounts</span>
            USER_MANAGEMENT
          </h3>
          <span className="text-[10px] font-mono text-on-surface-variant">{users.length} USERS</span>
        </div>

        {usersLoading ? (
          <LoadingSpinner text="LOADING USERS..." />
        ) : users.length === 0 ? (
          <EmptyState icon="person" title="NO USERS" message="No registered users found." />
        ) : (
          <table className="w-full text-left">
            <thead className="bg-surface-container-low">
              <tr className="text-label-caps text-[10px] text-on-surface-variant/70">
                <th className="px-inner-padding py-3">ID</th>
                <th className="px-inner-padding py-3">USERNAME</th>
                <th className="px-inner-padding py-3">EMAIL</th>
                <th className="px-inner-padding py-3">TEAM</th>
                <th className="px-inner-padding py-3">SOLVES</th>
                <th className="px-inner-padding py-3">ROLE</th>
                <th className="px-inner-padding py-3">JOINED</th>
                <th className="px-inner-padding py-3">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-white/20 transition-colors group">
                  <td className="px-inner-padding py-4 font-mono text-xs opacity-50">#{u.id}</td>
                  <td className="px-inner-padding py-4 font-bold text-primary">
                    {u.username}
                    {u.id === currentUser?.id && (
                      <span className="text-[9px] text-secondary ml-2 font-mono">(YOU)</span>
                    )}
                  </td>
                  <td className="px-inner-padding py-4 text-xs text-on-surface-variant">{u.email}</td>
                  <td className="px-inner-padding py-4 text-xs font-mono">{u.team_name || '—'}</td>
                  <td className="px-inner-padding py-4 font-mono text-xs">{u.solve_count}</td>
                  <td className="px-inner-padding py-4">
                    <span
                      className={`px-2 py-1 text-[10px] font-bold rounded-full ${
                        u.role === 'admin'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {u.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-inner-padding py-4 text-[11px] text-on-surface-variant">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-inner-padding py-4">
                    <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleToggleRole(u.id, u.role)}
                        disabled={u.id === currentUser?.id}
                        className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded transition-all ${
                          u.id === currentUser?.id
                            ? 'opacity-30 cursor-not-allowed'
                            : u.role === 'admin'
                            ? 'hover:bg-yellow-100 text-yellow-700'
                            : 'hover:bg-purple-100 text-purple-700'
                        }`}
                        title={u.role === 'admin' ? 'Demote to user' : 'Promote to admin'}
                      >
                        <span className="material-symbols-outlined text-sm">
                          {u.role === 'admin' ? 'arrow_downward' : 'arrow_upward'}
                        </span>
                        {u.role === 'admin' ? 'DEMOTE' : 'PROMOTE'}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u.id, u.username)}
                        disabled={u.id === currentUser?.id}
                        className={`material-symbols-outlined text-sm transition-colors ${
                          u.id === currentUser?.id
                            ? 'opacity-30 cursor-not-allowed'
                            : 'cursor-pointer hover:text-error'
                        }`}
                        title="Delete user"
                      >
                        delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Join Requests */}
      <div className="glass-panel rounded-lg overflow-hidden">
        <div className="p-inner-padding border-b border-white/20 flex justify-between items-center bg-white/10">
          <h3 className="font-h3 text-h3 text-secondary flex items-center gap-2">
            <span className="material-symbols-outlined">group_add</span>
            JOIN_REQUESTS
          </h3>
          <span className="text-[10px] font-mono text-on-surface-variant">
            {joinRequests.filter((r) => r.status === 'pending').length} PENDING
          </span>
        </div>

        {joinRequestsLoading ? (
          <LoadingSpinner text="LOADING REQUESTS..." />
        ) : joinRequests.length === 0 ? (
          <EmptyState icon="group_add" title="NO REQUESTS" message="No join requests have been submitted." />
        ) : (
          <table className="w-full text-left">
            <thead className="bg-surface-container-low">
              <tr className="text-label-caps text-[10px] text-on-surface-variant/70">
                <th className="px-inner-padding py-3">USER</th>
                <th className="px-inner-padding py-3">EMAIL</th>
                <th className="px-inner-padding py-3">TEAM</th>
                <th className="px-inner-padding py-3">CAPTAIN</th>
                <th className="px-inner-padding py-3">REQUESTED</th>
                <th className="px-inner-padding py-3">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {joinRequests.map((jr) => (
                <tr key={jr.id} className="hover:bg-white/20 transition-colors">
                  <td className="px-inner-padding py-4 font-bold text-primary">{jr.username}</td>
                  <td className="px-inner-padding py-4 text-xs text-on-surface-variant">{jr.email}</td>
                  <td className="px-inner-padding py-4 text-xs font-mono">{jr.team_name}</td>
                  <td className="px-inner-padding py-4 text-xs font-mono text-secondary">{jr.captain_name || '—'}</td>
                  <td className="px-inner-padding py-4 text-[11px] text-on-surface-variant">
                    {new Date(jr.created_at).toLocaleString()}
                  </td>
                  <td className="px-inner-padding py-4">
                    <span
                      className={`px-2 py-1 text-[10px] font-bold rounded-full ${
                        jr.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : jr.status === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {jr.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Announcements + System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
        <div className="glass-panel rounded-lg flex flex-col">
          <div className="p-inner-padding border-b border-white/20">
            <h3 className="font-h3 text-h3 text-secondary flex items-center gap-2">
              <span className="material-symbols-outlined">feed</span>
              ANNOUNCEMENTS
            </h3>
          </div>
          <div className="flex-1 p-inner-padding space-y-4 overflow-y-auto max-h-[300px]">
            {announcementsLoading ? (
              <LoadingSpinner text="LOADING..." />
            ) : announcements.length === 0 ? (
              <EmptyState icon="campaign" title="NO ANNOUNCEMENTS" message="Post your first announcement." />
            ) : (
              announcements.map((notice) => (
                <div key={notice.id} className="p-3 bg-primary/5 border-l-2 border-primary rounded-r">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold text-primary uppercase">{notice.type || 'INFO'}</span>
                    <span className="text-[10px] font-mono opacity-40">
                      {new Date(notice.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm">{notice.message}</p>
                </div>
              ))
            )}
          </div>
          <div className="p-4 border-t border-white/10">
            <div className="flex items-center bg-white/20 rounded-full px-4 py-2 border border-white/40">
              <input
                className="bg-transparent border-none focus:ring-0 text-sm flex-1"
                placeholder="Type a new announcement..."
                type="text"
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendAnnouncement()}
              />
              <button
                className="material-symbols-outlined text-primary hover:scale-110 transition-transform"
                onClick={handleSendAnnouncement}
              >
                send
              </button>
            </div>
          </div>
        </div>

        {/* System Health — Real Metrics */}
        <div className="glass-panel rounded-lg p-inner-padding">
          <h3 className="font-h3 text-h3 text-primary mb-5 flex items-center gap-2">
            <span className="material-symbols-outlined">monitoring</span>
            SYSTEM_HEALTH
          </h3>
          {healthLoading ? (
            <LoadingSpinner />
          ) : !health ? (
            <ErrorState message="Failed to load health" onRetry={refetchHealth} />
          ) : (
            <div className="space-y-5">
              {/* Uptime + DB */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-surface-container/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-[10px] font-label-caps opacity-60">UPTIME</span>
                  </div>
                  <p className="font-mono text-lg text-primary font-bold">
                    {formatUptime(health.uptime_seconds)}
                  </p>
                </div>
                <div className="p-3 bg-surface-container/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-sm text-secondary">database</span>
                    <span className="text-[10px] font-label-caps opacity-60">DB SIZE</span>
                  </div>
                  <p className="font-mono text-lg text-secondary font-bold">{health.db_size_mb} MB</p>
                </div>
              </div>

              {/* Activity last 24h */}
              <div>
                <p className="text-[10px] font-label-caps opacity-50 mb-3">LAST 24H ACTIVITY</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/10">
                    <span className="material-symbols-outlined text-primary text-xl">flag</span>
                    <div>
                      <p className="font-mono text-xl font-bold text-primary">{health.recent_solves_24h}</p>
                      <p className="text-[10px] opacity-50">SOLVES</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-secondary/5 rounded-lg border border-secondary/10">
                    <span className="material-symbols-outlined text-secondary text-xl">person_add</span>
                    <div>
                      <p className="font-mono text-xl font-bold text-secondary">{health.recent_registrations_24h}</p>
                      <p className="text-[10px] opacity-50">REGISTRATIONS</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-surface-container/30 rounded-lg text-center">
                  <p className="text-[9px] font-label-caps opacity-50">ACTIVE TEAMS</p>
                  <p className="font-mono text-lg font-bold text-primary mt-1">
                    {health.active_teams}/{health.total_teams}
                  </p>
                </div>
                <div className="p-3 bg-surface-container/30 rounded-lg text-center">
                  <p className="text-[9px] font-label-caps opacity-50">AVG SCORE</p>
                  <p className="font-mono text-lg font-bold text-secondary mt-1">{health.avg_team_score}</p>
                </div>
                <div className="p-3 bg-surface-container/30 rounded-lg text-center">
                  <p className="text-[9px] font-label-caps opacity-50">PENDING</p>
                  <p className={`font-mono text-lg font-bold mt-1 ${
                    health.pending_requests > 0 ? 'text-yellow-500' : 'text-green-500'
                  }`}>
                    {health.pending_requests}
                  </p>
                </div>
              </div>

              {/* Challenge coverage */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-mono">CHALLENGE COVERAGE</span>
                  <span className="text-xs font-mono text-primary">
                    {health.active_challenges}/{health.total_challenges} ACTIVE
                  </span>
                </div>
                <div className="w-full h-2 bg-surface-variant rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all"
                    style={{
                      width: `${health.total_challenges > 0
                        ? Math.round((health.active_challenges / health.total_challenges) * 100)
                        : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Challenge Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="glass-card w-full max-w-lg rounded-xl p-container-padding mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-h3 text-h3 text-primary">CREATE_CHALLENGE</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="material-symbols-outlined text-on-surface-variant hover:text-error transition-colors"
              >
                close
              </button>
            </div>
            <form className="space-y-4" onSubmit={handleCreateChallenge}>
              <div>
                <label className="font-label-caps text-[10px] text-on-surface-variant/70 ml-1">TITLE</label>
                <input
                  className="glass-input w-full px-4 py-3 rounded-lg font-mono text-mono mt-1"
                  required
                  value={newChallenge.title}
                  onChange={(e) => setNewChallenge((p) => ({ ...p, title: e.target.value }))}
                />
              </div>
              <div>
                <label className="font-label-caps text-[10px] text-on-surface-variant/70 ml-1">DESCRIPTION</label>
                <textarea
                  className="glass-input w-full px-4 py-3 rounded-lg font-mono text-mono mt-1 min-h-[80px]"
                  value={newChallenge.description}
                  onChange={(e) => setNewChallenge((p) => ({ ...p, description: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-label-caps text-[10px] text-on-surface-variant/70 ml-1">CATEGORY</label>
                  <input
                    className="glass-input w-full px-4 py-3 rounded-lg font-mono text-mono mt-1"
                    placeholder="e.g. Web, Crypto"
                    required
                    value={newChallenge.category}
                    onChange={(e) => setNewChallenge((p) => ({ ...p, category: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="font-label-caps text-[10px] text-on-surface-variant/70 ml-1">POINTS</label>
                  <input
                    className="glass-input w-full px-4 py-3 rounded-lg font-mono text-mono mt-1"
                    type="number"
                    min={1}
                    required
                    value={newChallenge.points}
                    onChange={(e) => setNewChallenge((p) => ({ ...p, points: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-label-caps text-[10px] text-on-surface-variant/70 ml-1">DIFFICULTY (1-3)</label>
                  <select
                    className="glass-input w-full px-4 py-3 rounded-lg font-mono text-mono mt-1"
                    value={newChallenge.difficulty}
                    onChange={(e) => setNewChallenge((p) => ({ ...p, difficulty: parseInt(e.target.value) }))}
                  >
                    <option value={1}>1 — Easy</option>
                    <option value={2}>2 — Medium</option>
                    <option value={3}>3 — Hard</option>
                  </select>
                </div>
                <div>
                  <label className="font-label-caps text-[10px] text-on-surface-variant/70 ml-1">STATUS</label>
                  <select
                    className="glass-input w-full px-4 py-3 rounded-lg font-mono text-mono mt-1"
                    value={newChallenge.status}
                    onChange={(e) => setNewChallenge((p) => ({ ...p, status: e.target.value }))}
                  >
                    <option value="active">Active</option>
                    <option value="hidden">Hidden</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="font-label-caps text-[10px] text-on-surface-variant/70 ml-1">FLAG</label>
                <input
                  className="glass-input w-full px-4 py-3 rounded-lg font-mono text-mono mt-1"
                  placeholder="XYZ{flag_here}"
                  required
                  value={newChallenge.flag}
                  onChange={(e) => setNewChallenge((p) => ({ ...p, flag: e.target.value }))}
                />
              </div>
              <button
                type="submit"
                disabled={creating}
                className="w-full bg-gradient-to-r from-primary to-secondary text-white font-label-caps py-3 rounded-lg shadow-lg hover:shadow-[0_0_20px_rgba(0,105,111,0.3)] transition-all disabled:opacity-50"
              >
                {creating ? 'CREATING...' : 'CREATE_CHALLENGE'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
