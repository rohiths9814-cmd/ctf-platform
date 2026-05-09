import { useState } from 'react';
import { useApi, useMutation } from '../hooks/useApi';
import { challengesAPI } from '../api/endpoints';
import { LoadingSpinner, EmptyState, ErrorState } from '../components/ui/StatusStates';

export default function Challenges() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [submitModal, setSubmitModal] = useState(null); // challenge object or null
  const [flagInput, setFlagInput] = useState('');
  const [submitResult, setSubmitResult] = useState(null); // { success, message }

  const {
    data: challengesData,
    loading,
    error,
    execute: refetch,
  } = useApi(() => challengesAPI.getAll());

  const { mutate: submitFlag, loading: submitting } = useMutation(
    (id, flag) => challengesAPI.submitFlag(id, flag)
  );

  const challenges = challengesData?.challenges || [];

  // Dynamic category list from data
  const categories = ['All', ...new Set(challenges.map((c) => c.category).filter(Boolean))];

  const filteredChallenges = activeFilter === 'All'
    ? challenges
    : challenges.filter((c) => c.category === activeFilter);

  const handleSubmitFlag = async (e) => {
    e.preventDefault();
    if (!submitModal || !flagInput.trim()) return;
    try {
      const result = await submitFlag(submitModal.id, flagInput);
      if (result.success) {
        setSubmitResult({ success: true, message: result.message || 'Correct! Flag accepted.' });
        refetch();
      } else {
        setSubmitResult({ success: false, message: result.message || 'Incorrect flag.' });
      }
    } catch (err) {
      setSubmitResult({ success: false, message: err.message || 'Submission failed.' });
    }
  };

  const openSubmitModal = (challenge) => {
    setSubmitModal(challenge);
    setFlagInput('');
    setSubmitResult(null);
  };

  const categoryIcons = {
    Web: 'language', Pwn: 'memory', Crypto: 'lock', Reversing: 'code', Forensics: 'search',
  };

  const difficultyColors = ['primary', 'secondary', 'tertiary'];

  return (
    <div className="space-y-panel-gap">
      {/* Filter Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex gap-3 flex-wrap">
          {categories.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`glass-card px-6 py-2 rounded-full transition-all ${
                activeFilter === f
                  ? 'text-primary font-bold border-primary/40 shadow-[0_0_10px_rgba(0,219,231,0.2)]'
                  : 'text-on-surface-variant hover:text-primary hover:border-primary/20'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4 font-mono text-xs text-primary bg-primary/5 px-4 py-2 rounded-lg border border-primary/10">
          <span className="flex items-center">
            <span className="w-2 h-2 rounded-full bg-primary mr-2 animate-pulse" />
            CHALLENGES: {challenges.filter((c) => c.is_solved).length}/{challenges.length} SOLVED
          </span>
        </div>
      </div>

      {/* Challenge Grid */}
      {loading ? (
        <LoadingSpinner text="LOADING CHALLENGES..." />
      ) : error ? (
        <ErrorState message="Failed to load challenges" onRetry={refetch} />
      ) : filteredChallenges.length === 0 ? (
        <EmptyState icon="security" title="NO CHALLENGES" message={activeFilter === 'All' ? 'No challenges available yet.' : `No challenges in ${activeFilter} category.`} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
          {filteredChallenges.map((challenge) => (
            <div
              key={challenge.id}
              onClick={() => !challenge.is_solved && openSubmitModal(challenge)}
              className={`glass-card p-inner-padding rounded-xl relative group transition-all cursor-pointer
                ${challenge.is_solved
                  ? 'border-green-400/30 opacity-80'
                  : 'hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(0,219,231,0.15)]'}
              `}
            >
              {/* Corner dots */}
              <div className="absolute top-2 left-2 w-1 h-1 bg-primary-fixed-dim rounded-full" />
              <div className="absolute top-2 right-2 w-1 h-1 bg-primary-fixed-dim rounded-full" />

              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded border ${challenge.is_solved ? 'bg-green-100 border-green-300' : 'bg-primary/5 border-primary/10'}`}>
                  <span className={`material-symbols-outlined text-sm ${challenge.is_solved ? 'text-green-600' : 'text-primary'}`}>
                    {categoryIcons[challenge.category] || 'security'}
                  </span>
                </div>
                <span className="font-mono text-[10px] opacity-40 uppercase">{challenge.category}</span>
                {challenge.is_solved && (
                  <span className="ml-auto material-symbols-outlined text-green-600" style={{ fontVariationSettings: "'FILL' 1" }}>
                    check_circle
                  </span>
                )}
              </div>

              {/* Title */}
              <h4 className="font-h3 text-lg mb-2">{challenge.title}</h4>

              {/* Description */}
              {challenge.description && (
                <p className="text-sm text-on-surface-variant/70 mb-4 line-clamp-2">{challenge.description}</p>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/10">
                <div className="flex gap-1">
                  {[1, 2, 3].map((d) => (
                    <span
                      key={d}
                      className={`w-2 h-2 rounded-full ${d <= challenge.difficulty ? `bg-${difficultyColors[challenge.difficulty - 1] || 'primary'}` : 'bg-surface-variant'}`}
                    />
                  ))}
                </div>
                <span className="font-mono text-xs text-primary font-bold">{challenge.points} PTS</span>
                <span className="font-mono text-[10px] opacity-40">{challenge.solve_count || 0} solves</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Flag Submission Modal */}
      {submitModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md rounded-xl p-container-padding mx-4">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-h3 text-h3 text-primary">{submitModal.title}</h3>
                <p className="text-xs font-mono text-on-surface-variant mt-1">{submitModal.category} • {submitModal.points} PTS</p>
              </div>
              <button
                onClick={() => setSubmitModal(null)}
                className="material-symbols-outlined text-on-surface-variant hover:text-error transition-colors"
              >
                close
              </button>
            </div>

            {submitModal.description && (
              <p className="text-sm text-on-surface-variant mb-6 p-4 bg-surface-container/30 rounded-lg border border-white/10">
                {submitModal.description}
              </p>
            )}

            {submitResult && (
              <div className={`p-3 rounded-lg mb-4 flex items-center gap-2 text-sm font-mono ${
                submitResult.success
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : 'bg-error/10 text-error border border-error/30'
              }`}>
                <span className="material-symbols-outlined text-sm">
                  {submitResult.success ? 'check_circle' : 'error'}
                </span>
                {submitResult.message}
              </div>
            )}

            {!submitResult?.success && (
              <form onSubmit={handleSubmitFlag}>
                <div className="flex flex-col gap-2">
                  <label className="font-label-caps text-[10px] text-on-surface-variant/70 ml-1">SUBMIT FLAG</label>
                  <input
                    className="glass-input w-full px-4 py-3 rounded-lg font-mono text-mono"
                    placeholder="XYZ{your_flag_here}"
                    value={flagInput}
                    onChange={(e) => setFlagInput(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-4 bg-gradient-to-r from-primary to-secondary text-white font-label-caps py-3 rounded-lg shadow-lg hover:shadow-[0_0_20px_rgba(0,105,111,0.3)] transition-all disabled:opacity-50"
                >
                  {submitting ? 'VERIFYING...' : 'SUBMIT_FLAG'}
                </button>
              </form>
            )}

            {submitResult?.success && (
              <button
                onClick={() => setSubmitModal(null)}
                className="w-full mt-4 bg-green-600 text-white font-label-caps py-3 rounded-lg transition-all hover:bg-green-700"
              >
                CONTINUE
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
