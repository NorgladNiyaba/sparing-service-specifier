function Shimmer({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-lg ${className ?? ""}`}
      style={{ background: "#ebebed", ...style }}
    />
  );
}

export function SkeletonStatCard() {
  return (
    <div className="rounded-2xl bg-white px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
      <Shimmer style={{ height: 9, width: 80 }} />
      <Shimmer style={{ height: 26, width: 110, marginTop: 10 }} />
      <Shimmer style={{ height: 9, width: 70, marginTop: 6 }} />
    </div>
  );
}

export function SkeletonDocRow() {
  return (
    <div className="flex items-center gap-4 rounded-xl border bg-white px-4 py-3.5" style={{ borderColor: "#ebecef" }}>
      <div className="h-9 w-9 shrink-0 rounded-lg animate-pulse" style={{ background: "#f0f0f2" }} />
      <div className="flex-1 space-y-2">
        <Shimmer style={{ height: 12, width: "55%" }} />
        <Shimmer style={{ height: 9, width: "30%" }} />
      </div>
      <Shimmer style={{ height: 30, width: 80, borderRadius: 8 }} />
    </div>
  );
}

export function SkeletonFolderCard() {
  return (
    <div className="flex flex-col rounded-2xl border bg-white p-4" style={{ borderColor: "#ebecef" }}>
      <div className="mb-3 h-10 w-10 rounded-xl animate-pulse" style={{ background: "#f0f0f2" }} />
      <Shimmer style={{ height: 12, width: "65%" }} />
      <Shimmer style={{ height: 9, width: "40%", marginTop: 6 }} />
    </div>
  );
}

export function SkeletonUploadRow() {
  return (
    <div className="flex items-center gap-4 rounded-xl border bg-white px-5 py-3.5" style={{ borderColor: "#ebecef" }}>
      <div className="h-9 w-9 shrink-0 rounded-lg animate-pulse" style={{ background: "#f0f0f2" }} />
      <div className="flex-1 space-y-2">
        <Shimmer style={{ height: 12, width: "50%" }} />
        <Shimmer style={{ height: 9, width: "30%" }} />
      </div>
      <Shimmer style={{ height: 24, width: 56, borderRadius: 99 }} />
    </div>
  );
}

export function SkeletonBillingCard() {
  return (
    <div className="rounded-2xl border bg-white p-6" style={{ borderColor: "#ebecef" }}>
      <Shimmer style={{ height: 12, width: 120, marginBottom: 16 }} />
      <Shimmer style={{ height: 36, width: 160, marginBottom: 8 }} />
      <Shimmer style={{ height: 10, width: 200 }} />
    </div>
  );
}

export function SkeletonWelcomeBanner() {
  return (
    <div className="mx-6 mt-6 overflow-hidden rounded-2xl px-8 py-7 animate-pulse" style={{ background: "#1a1a1c", minHeight: 110 }}>
      <Shimmer style={{ height: 9, width: 80, background: "rgba(255,255,255,0.08)" }} />
      <Shimmer style={{ height: 28, width: 220, marginTop: 10, background: "rgba(255,255,255,0.1)" }} />
      <Shimmer style={{ height: 20, width: 100, marginTop: 12, borderRadius: 99, background: "rgba(255,255,255,0.08)" }} />
    </div>
  );
}
