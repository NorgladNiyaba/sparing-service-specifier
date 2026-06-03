interface EmptyStateProps {
  illustration: "documents" | "folder" | "uploads" | "invoices" | "payments" | "activity";
  title: string;
  body: string;
  action?: React.ReactNode;
}

const ILLUSTRATIONS: Record<EmptyStateProps["illustration"], React.ReactNode> = {
  documents: (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
      <rect x="10" y="8" width="40" height="52" rx="5" fill="rgba(214,27,23,0.07)" stroke="rgba(214,27,23,0.2)" strokeWidth="1.5" />
      <rect x="18" y="16" width="24" height="3" rx="1.5" fill="rgba(214,27,23,0.18)" />
      <rect x="18" y="24" width="20" height="3" rx="1.5" fill="rgba(214,27,23,0.12)" />
      <rect x="18" y="32" width="22" height="3" rx="1.5" fill="rgba(214,27,23,0.12)" />
      <rect x="18" y="40" width="16" height="3" rx="1.5" fill="rgba(214,27,23,0.08)" />
      <circle cx="52" cy="52" r="14" fill="white" stroke="rgba(214,27,23,0.15)" strokeWidth="1.5" />
      <path d="M52 46v6m0 4h.01" stroke="#d61b17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  folder: (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
      <path d="M8 22a4 4 0 014-4h16l6 6h26a4 4 0 014 4v20a4 4 0 01-4 4H12a4 4 0 01-4-4V22z" fill="rgba(214,27,23,0.08)" stroke="rgba(214,27,23,0.22)" strokeWidth="1.5" />
      <path d="M20 36h32M20 44h20" stroke="rgba(214,27,23,0.25)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  uploads: (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
      <rect x="12" y="44" width="48" height="16" rx="4" fill="rgba(214,27,23,0.07)" stroke="rgba(214,27,23,0.18)" strokeWidth="1.5" />
      <path d="M36 12v28M26 22l10-10 10 10" stroke="#d61b17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="20" cy="52" r="3" fill="rgba(214,27,23,0.3)" />
    </svg>
  ),
  invoices: (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
      <rect x="14" y="10" width="44" height="52" rx="5" fill="rgba(214,27,23,0.07)" stroke="rgba(214,27,23,0.2)" strokeWidth="1.5" />
      <path d="M24 24h24M24 32h16M24 40h20M24 48h12" stroke="rgba(214,27,23,0.2)" strokeWidth="2" strokeLinecap="round" />
      <path d="M42 40l6 6 10-10" stroke="rgba(16,185,129,0.5)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  payments: (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
      <rect x="8" y="16" width="56" height="40" rx="6" fill="rgba(214,27,23,0.07)" stroke="rgba(214,27,23,0.2)" strokeWidth="1.5" />
      <rect x="8" y="26" width="56" height="8" fill="rgba(214,27,23,0.1)" />
      <rect x="16" y="42" width="16" height="6" rx="2" fill="rgba(214,27,23,0.15)" />
      <rect x="36" y="42" width="10" height="6" rx="2" fill="rgba(214,27,23,0.1)" />
    </svg>
  ),
  activity: (
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
      <polyline points="8,44 20,44 28,20 44,56 52,36 64,36" stroke="rgba(214,27,23,0.25)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="36" cy="36" r="20" stroke="rgba(214,27,23,0.1)" strokeWidth="1.5" fill="none" strokeDasharray="4 4" />
    </svg>
  ),
};

export function EmptyState({ illustration, title, body, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl" style={{ background: "rgba(214,27,23,0.04)", border: "1px solid rgba(214,27,23,0.1)" }}>
        {ILLUSTRATIONS[illustration]}
      </div>
      <p className="text-sm font-semibold" style={{ color: "#171717" }}>{title}</p>
      <p className="mt-1.5 max-w-[240px] text-xs leading-relaxed" style={{ color: "#9ca3af" }}>{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
