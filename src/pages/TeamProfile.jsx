import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { teamsAPI } from '../api/endpoints';
import { LoadingSpinner, EmptyState, ErrorState } from '../components/ui/StatusStates';

export default function TeamProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const [transferTarget, setTransferTarget] = useState(null);

  const teamId = id === 'me' ? user?.team_id : id;

  const {
    data: teamData,
    loading: teamLoading,
    error: teamError,
    execute: refetchTeam,
  } = useApi(() => teamsAPI.getById(teamId), [teamId], !!teamId);

  const {
    data: activityData,
    loading: activityLoading,
  } = useApi(() => teamsAPI.getActivity(teamId), [teamId], !!teamId);

  // Pending requests (only for captain)
  const {
    data: pendingData,
    execute: refetchPending,
  } = useApi(() => teamsAPI.pendingRequests(), [], true);

  const team = teamData?.team || {};
  const members = teamData?.members || [];
  const activities = activityData?.activities || [];
  const pendingRequests = pendingData?.requests || [];
  const isCaptain = team.captain_id === user?.id;
  const isMyTeam = id === 'me' || parseInt(id) === user?.team_id;

  const handleApprove = async (requestId) => {
    try {
      await teamsAPI.approveRequest(requestId);
      refetchPending();
      refetchTeam();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve');
    }
  };

  const handleReject = async (requestId) => {
    if (!confirm('Reject this join request?')) return;
    try {
      await teamsAPI.rejectRequest(requestId);
      refetchPending();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject');
    }
  };

  const handleTransferCaptain = async () => {
    if (!transferTarget) return;
    if (!confirm('Transfer captain role? This cannot be undone without the new captain transferring it back.')) return;
    try {
      await teamsAPI.transferCaptain(transferTarget);
      setTransferTarget(null);
      refetchTeam();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to transfer');
    }
  };

  if (!teamId) {
    return (
      <EmptyState
        icon="group_off"
        title="NO TEAM"
        message="You are not part of a team yet. Create or join a team to view your team profile."
      />
    );
  }

  if (teamLoading) return <LoadingSpinner text="LOADING TEAM DATA..." />;
  if (teamError) return <ErrorState message="Failed to load team data" onRetry={refetchTeam} />;

  return (
    <div className="space-y-panel-gap">
      {/* Team Header */}
      <header className="glass-card rounded-xl p-container-padding relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[80px] -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary/10 blur-[60px] -ml-24 -mb-24" />
        <div className="relative flex flex-col md:flex-row items-center gap-container-padding">
          {/* Avatar */}
          <div className="relative">
            <div className="w-40 h-40 rounded-full border-4 border-white/50 shadow-2xl overflow-hidden holographic-border bg-primary/5 flex items-center justify-center">
              <span className="font-h1 text-[48px] text-primary font-bold">
                {team.name?.substring(0, 2).toUpperCase() || '??'}
              </span>
            </div>
            {team.rank && (
              <div className="absolute -bottom-2 -right-2 bg-primary-container text-on-primary-container text-[10px] font-bold px-3 py-1 rounded-full shadow-lg">
                RANK #{team.rank}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 text-center md:text-left">
            <h1 className="font-h1 text-h2 md:text-h1 text-on-surface tracking-tighter">
              {team.name || 'UNKNOWN_TEAM'}
            </h1>
            {team.description && (
              <p className="text-on-surface-variant font-body-lg max-w-2xl mt-2">{team.description}</p>
            )}
            <div className="flex flex-wrap gap-gutter mt-inner-padding">
              {[
                { label: 'Total Score', value: `${(team.total_score || 0).toLocaleString()} PTS` },
                { label: 'Challenges Solved', value: team.solve_count || 0 },
                { label: 'Members', value: `${members.length}/3` },
              ].map((stat, i) => (
                <div key={stat.label} className={`flex flex-col ${i > 0 ? 'border-l border-outline-variant/30 pl-gutter' : ''}`}>
                  <span className="font-mono text-label-caps text-secondary uppercase opacity-60">{stat.label}</span>
                  <span className="font-h3 text-h3 text-primary font-bold">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Pending Join Requests (Captain Only) */}
      {isCaptain && isMyTeam && pendingRequests.length > 0 && (
        <div className="glass-card rounded-xl p-inner-padding border-l-4 border-yellow-500">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-yellow-600">pending_actions</span>
            <h3 className="font-h3 text-h3 text-yellow-700">JOIN REQUESTS</h3>
            <span className="bg-yellow-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ml-2">
              {pendingRequests.length}
            </span>
          </div>
          <div className="space-y-3">
            {pendingRequests.map((req) => (
              <div key={req.id} className="flex items-center justify-between p-3 bg-yellow-500/5 rounded-lg border border-yellow-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                    <span className="font-bold text-yellow-700 text-sm">
                      {req.username?.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-on-surface">{req.username}</p>
                    <p className="text-[10px] text-on-surface-variant">{req.email} • {new Date(req.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(req.id)}
                    disabled={members.length >= 3}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-500/10 text-green-700 text-[11px] font-bold rounded-lg hover:bg-green-500/20 transition-all disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-sm">check</span>
                    APPROVE
                  </button>
                  <button
                    onClick={() => handleReject(req.id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-red-500/10 text-red-700 text-[11px] font-bold rounded-lg hover:bg-red-500/20 transition-all"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                    REJECT
                  </button>
                </div>
              </div>
            ))}
            {members.length >= 3 && (
              <p className="text-[10px] text-on-surface-variant/60 font-mono text-center">
                TEAM IS FULL — Cannot approve more members
              </p>
            )}
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-panel-gap">
        {/* Members */}
        <section className="lg:col-span-4">
          <div className="glass-card rounded-xl p-inner-padding corner-accent">
            <div className="flex items-center justify-between mb-gutter">
              <h3 className="font-h3 text-h3 tracking-tight">Team Members</h3>
              <span className="text-primary font-mono text-[12px]">{members.length}/3</span>
            </div>
            <div className="space-y-4">
              {members.length === 0 ? (
                <EmptyState icon="person" title="NO MEMBERS" message="No team members found." />
              ) : (
                members.map((member) => (
                  <div key={member.id} className="flex items-center gap-unit p-unit rounded-lg hover:bg-white/40 transition-colors group">
                    <div className="w-12 h-12 rounded-full overflow-hidden border border-primary/20 bg-primary/10 flex items-center justify-center relative">
                      <span className="font-bold text-primary">
                        {member.username?.substring(0, 2).toUpperCase()}
                      </span>
                      {member.is_captain && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center shadow-sm" title="Captain">
                          <span className="material-symbols-outlined text-white text-[12px]">star</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold group-hover:text-primary transition-colors text-on-surface">
                        {member.username}
                        {member.id === user?.id && (
                          <span className="text-[10px] text-primary ml-2 font-mono">(YOU)</span>
                        )}
                      </p>
                      <p className="text-[12px] text-on-surface-variant">
                        {member.is_captain ? '⭐ Captain' : 'Member'} • {member.solve_count || 0} solves
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Captain Transfer */}
            {isCaptain && isMyTeam && members.length > 1 && (
              <div className="mt-gutter pt-gutter border-t border-white/10">
                <p className="text-[10px] font-mono text-on-surface-variant/60 mb-2 uppercase">Transfer Captain</p>
                <div className="flex gap-2">
                  <select
                    value={transferTarget || ''}
                    onChange={(e) => setTransferTarget(parseInt(e.target.value) || null)}
                    className="glass-input flex-1 px-3 py-2 rounded-lg text-xs font-mono"
                  >
                    <option value="">Select member</option>
                    {members.filter((m) => m.id !== user?.id).map((m) => (
                      <option key={m.id} value={m.id}>{m.username}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleTransferCaptain}
                    disabled={!transferTarget}
                    className="px-3 py-2 bg-yellow-500/10 text-yellow-700 text-[11px] font-bold rounded-lg hover:bg-yellow-500/20 transition-all disabled:opacity-40"
                  >
                    TRANSFER
                  </button>
                </div>
              </div>
            )}

            {members.length < 3 && (
              <p className="text-center text-[10px] text-on-surface-variant/60 mt-4 font-mono">
                {isCaptain ? 'WAITING FOR JOIN REQUESTS' : `${3 - members.length} SLOT(S) OPEN`}
              </p>
            )}
            {members.length >= 3 && (
              <p className="text-center text-[10px] text-on-surface-variant/60 mt-4 font-mono">
                TEAM IS FULL (3/3 MEMBERS)
              </p>
            )}
          </div>
        </section>

        {/* Activity */}
        <section className="lg:col-span-8">
          <div className="glass-card rounded-xl p-inner-padding relative overflow-hidden">
            <div className="flex items-center justify-between mb-gutter border-b border-white/20 pb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">analytics</span>
                <h3 className="font-h3 text-h3 tracking-tight">Activity Timeline</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span className="font-mono text-[10px] uppercase opacity-60">Live</span>
              </div>
            </div>

            {activityLoading ? (
              <LoadingSpinner text="LOADING ACTIVITY..." />
            ) : activities.length === 0 ? (
              <EmptyState icon="timeline" title="NO ACTIVITY" message="Solve challenges to see activity here." />
            ) : (
              <div className="space-y-gutter relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[1px] before:bg-gradient-to-b before:from-primary before:to-transparent">
                {activities.map((event, i) => (
                  <div key={i} className="relative pl-gutter">
                    <div className="absolute left-0 top-2 w-[7px] h-[7px] rounded-full border-4 border-white ring-2 bg-primary ring-primary/20" />
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-primary">{event.username}</span>{' '}
                        <span className="text-on-surface-variant">solved</span>{' '}
                        <span className="font-mono font-bold text-secondary">{event.challenge_title}</span>
                      </div>
                      <div className="flex items-center gap-gutter">
                        <span className="text-green-600 font-bold">+{event.points} PTS</span>
                        <span className="text-[12px] text-on-surface-variant opacity-60">
                          {new Date(event.solved_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
