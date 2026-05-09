/**
 * Reusable loading spinner component
 */
export function LoadingSpinner({ text = 'LOADING...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      <p className="font-mono text-[10px] text-primary tracking-widest animate-pulse">{text}</p>
    </div>
  );
}

/**
 * Empty state placeholder
 */
export function EmptyState({ icon = 'inbox', title = 'NO DATA', message = 'Nothing to display yet.' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 opacity-50">
      <span className="material-symbols-outlined text-5xl text-on-surface-variant">{icon}</span>
      <p className="font-label-caps text-label-caps text-on-surface-variant">{title}</p>
      <p className="text-sm text-on-surface-variant">{message}</p>
    </div>
  );
}

/**
 * Error state with retry
 */
export function ErrorState({ message = 'Failed to load data', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <span className="material-symbols-outlined text-5xl text-error">error_outline</span>
      <p className="font-mono text-sm text-error">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 px-4 py-2 bg-primary text-white text-xs font-bold rounded hover:bg-primary/90 transition-colors"
        >
          RETRY
        </button>
      )}
    </div>
  );
}
