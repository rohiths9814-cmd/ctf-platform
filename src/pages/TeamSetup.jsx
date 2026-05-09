import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { teamsAPI } from '../api/endpoints';
import Footer from '../components/layout/Footer';

export default function TeamSetup() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState(null); // null | 'create' | 'join'
  const [teamName, setTeamName] = useState('');
  const [teams, setTeams] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // If user already has a team, redirect to dashboard
  useEffect(() => {
    if (user?.team_id) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  // Fetch user's pending requests
  const fetchMyRequests = useCallback(() => {
    teamsAPI.myRequests().then((data) => {
      setMyRequests(data.requests || []);
      // If any request was approved, update user and redirect
      const approved = (data.requests || []).find((r) => r.status === 'approved');
      if (approved) {
        updateUser({ team_id: approved.team_id, team_name: approved.team_name });
        navigate('/dashboard');
      }
    }).catch(() => {});
  }, [updateUser, navigate]);

  useEffect(() => {
    fetchMyRequests();
    // Poll every 10s to check for approval
    const interval = setInterval(fetchMyRequests, 10000);
    return () => clearInterval(interval);
  }, [fetchMyRequests]);

  // Fetch available teams when "Join" mode is selected
  useEffect(() => {
    if (mode === 'join') {
      teamsAPI.getAll().then((data) => setTeams(data.teams || [])).catch(() => setTeams([]));
    }
  }, [mode]);

  const filteredTeams = teams.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingRequests = myRequests.filter((r) => r.status === 'pending');
  const hasPendingFor = (teamId) => pendingRequests.some((r) => r.team_id === teamId);

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const data = await teamsAPI.create(teamName.trim());
      updateUser({ team_id: data.team_id, team_name: data.team_name });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create team');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestJoin = async (teamId, teamNameStr) => {
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const data = await teamsAPI.requestJoin(teamId);
      setSuccessMsg(data.message || `Request sent to ${teamNameStr}`);
      fetchMyRequests();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background min-h-screen flex flex-col font-body-md text-on-surface overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary-container/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-secondary-container/10 blur-[120px]" />
      </div>

      <main className="flex-grow flex items-center justify-center p-gutter relative">
        <div className="glass-card relative w-full max-w-lg rounded-lg p-container-padding flex flex-col gap-unit">
          {/* Corner dots */}
          <div className="absolute top-4 left-4 w-1 h-1 bg-primary-fixed-dim rounded-full" />
          <div className="absolute top-4 right-4 w-1 h-1 bg-primary-fixed-dim rounded-full" />
          <div className="absolute bottom-4 left-4 w-1 h-1 bg-primary-fixed-dim rounded-full" />
          <div className="absolute bottom-4 right-4 w-1 h-1 bg-primary-fixed-dim rounded-full" />

          {/* Header */}
          <div className="text-center mb-6">
            <span className="material-symbols-outlined text-primary text-[48px] mb-2">group_add</span>
            <h1 className="font-h2 text-h2 text-primary tracking-tighter">TEAM_SETUP</h1>
            <p className="font-mono text-mono text-on-surface-variant/60 mt-2 text-[11px] uppercase tracking-widest">
              Welcome, {user?.username}! Choose your squad.
            </p>
            <p className="text-xs text-on-surface-variant/50 mt-1">
              Each team can have up to 3 members.
            </p>
          </div>

          {/* Pending Requests Banner */}
          {pendingRequests.length > 0 && !mode && (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-yellow-600 text-sm">hourglass_top</span>
                <span className="text-[11px] font-bold text-yellow-700 uppercase">Pending Requests</span>
              </div>
              {pendingRequests.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-1">
                  <span className="text-sm">
                    <span className="font-bold">{r.team_name}</span>
                    <span className="text-on-surface-variant/60 text-xs ml-2">— Waiting for captain approval</span>
                  </span>
                  <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                </div>
              ))}
              <p className="text-[10px] text-on-surface-variant/50 mt-2 font-mono">
                Auto-checking for updates...
              </p>
            </div>
          )}

          {/* Error / Success */}
          {error && (
            <div className="p-3 bg-error/10 border border-error/30 rounded-lg text-sm text-error font-mono flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">error</span>
              {error}
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-sm text-green-700 font-mono flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              {successMsg}
            </div>
          )}

          {/* Mode Selection */}
          {!mode && (
            <div className="flex flex-col gap-4">
              <button
                onClick={() => setMode('create')}
                className="group relative overflow-hidden glass-panel p-6 rounded-xl border border-white/20 hover:border-primary/40 transition-all text-left"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-[30px] -mr-8 -mt-8 group-hover:bg-primary/20 transition-all" />
                <div className="relative flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-primary text-2xl">add_circle</span>
                  </div>
                  <div>
                    <h3 className="font-h3 text-h3 text-primary mb-1">CREATE_TEAM</h3>
                    <p className="text-xs text-on-surface-variant">Start a new team — you'll be the captain</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setMode('join')}
                className="group relative overflow-hidden glass-panel p-6 rounded-xl border border-white/20 hover:border-secondary/40 transition-all text-left"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/10 rounded-full blur-[30px] -mr-8 -mt-8 group-hover:bg-secondary/20 transition-all" />
                <div className="relative flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-secondary text-2xl">group</span>
                  </div>
                  <div>
                    <h3 className="font-h3 text-h3 text-secondary mb-1">JOIN_TEAM</h3>
                    <p className="text-xs text-on-surface-variant">Request to join — captain must approve</p>
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Create Team Form */}
          {mode === 'create' && (
            <form onSubmit={handleCreateTeam} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="font-label-caps text-[10px] text-on-surface-variant/70 ml-2">TEAM NAME</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-[20px]">
                    flag
                  </span>
                  <input
                    value={teamName}
                    onChange={(e) => { setTeamName(e.target.value); setError(''); }}
                    className="glass-input w-full pl-12 pr-4 py-3 rounded-lg font-mono text-mono placeholder:text-on-surface-variant/30"
                    placeholder="Enter a unique team name"
                    type="text"
                    required
                    autoFocus
                  />
                </div>
                <p className="text-[10px] text-on-surface-variant/50 ml-2 font-mono">
                  You will become the team captain
                </p>
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => { setMode(null); setError(''); setTeamName(''); }}
                  className="flex-1 py-3 border border-outline-variant text-on-surface-variant font-label-caps rounded-lg hover:bg-white/20 transition-all"
                >
                  BACK
                </button>
                <button
                  type="submit"
                  disabled={loading || !teamName.trim()}
                  className="flex-[2] bg-gradient-to-r from-primary to-secondary text-white font-label-caps py-3 rounded-lg shadow-lg hover:shadow-[0_0_20px_rgba(0,105,111,0.3)] transition-all disabled:opacity-50"
                >
                  {loading ? 'CREATING...' : 'CREATE_TEAM'}
                </button>
              </div>
            </form>
          )}

          {/* Join Team Browser */}
          {mode === 'join' && (
            <div className="flex flex-col gap-4">
              {/* Search */}
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-[20px]">
                  search
                </span>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="glass-input w-full pl-12 pr-4 py-3 rounded-lg font-mono text-mono placeholder:text-on-surface-variant/30"
                  placeholder="Search teams..."
                  type="text"
                  autoFocus
                />
              </div>

              {/* Team list */}
              <div className="max-h-[280px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                {filteredTeams.length === 0 ? (
                  <div className="text-center py-8">
                    <span className="material-symbols-outlined text-on-surface-variant/30 text-[40px]">group_off</span>
                    <p className="text-sm text-on-surface-variant/50 mt-2 font-mono">
                      {teams.length === 0 ? 'No teams available' : 'No teams match your search'}
                    </p>
                  </div>
                ) : (
                  filteredTeams.map((team) => {
                    const isPending = hasPendingFor(team.id);
                    return (
                      <button
                        key={team.id}
                        onClick={() => !isPending && handleRequestJoin(team.id, team.name)}
                        disabled={loading || isPending}
                        className={`w-full flex items-center justify-between p-4 glass-panel rounded-lg border transition-all group text-left ${
                          isPending
                            ? 'border-yellow-500/30 bg-yellow-500/5 cursor-default'
                            : 'border-white/10 hover:border-secondary/30 hover:bg-white/20'
                        } disabled:opacity-60`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            isPending ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-secondary/10 border border-secondary/20'
                          }`}>
                            <span className={`font-bold text-sm ${isPending ? 'text-yellow-600' : 'text-secondary'}`}>
                              {team.name.substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className={`font-bold transition-colors ${
                              isPending ? 'text-yellow-700' : 'text-on-surface group-hover:text-secondary'
                            }`}>
                              {team.name}
                            </p>
                            <p className="text-[10px] font-mono text-on-surface-variant/60">
                              {team.member_count}/3 members
                              {team.captain_name && ` • Captain: ${team.captain_name}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-0.5">
                            {[0, 1, 2].map((i) => (
                              <div
                                key={i}
                                className={`w-2 h-2 rounded-full ${
                                  i < team.member_count ? 'bg-secondary' : 'bg-surface-variant'
                                }`}
                              />
                            ))}
                          </div>
                          {isPending ? (
                            <span className="text-[10px] font-bold text-yellow-600 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse" />
                              PENDING
                            </span>
                          ) : (
                            <span className="material-symbols-outlined text-sm text-on-surface-variant/40 group-hover:text-secondary transition-colors">
                              send
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              <button
                type="button"
                onClick={() => { setMode(null); setError(''); setSearchQuery(''); setSuccessMsg(''); }}
                className="w-full py-3 border border-outline-variant text-on-surface-variant font-label-caps rounded-lg hover:bg-white/20 transition-all"
              >
                BACK
              </button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
