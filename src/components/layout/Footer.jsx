export default function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 h-8 flex items-center justify-between px-container-padding z-50 bg-surface-dim/80 backdrop-blur-lg border-t border-primary/20 font-mono text-mono uppercase tracking-[0.2em]">
      <div className="text-[10px] text-secondary-container opacity-60">
        © {new Date().getFullYear()} XYZ_CTF // CONNECTIVITY: OPTIMAL
      </div>
      <div className="flex gap-8">
        <a className="text-[10px] text-on-surface-variant/60 hover:text-primary transition-colors" href="#">
          Privacy Protocol
        </a>
        <a className="text-[10px] text-on-surface-variant/60 hover:text-primary transition-colors" href="#">
          Rules
        </a>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
        <span className="text-[10px] text-primary-fixed-dim">SYSTEM_ONLINE</span>
      </div>
    </footer>
  );
}
