export function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-5 py-4">
          <div className="h-3.5 rounded-md animate-pulse" style={{ background: "#f0f0f2", width: i === 0 ? "60%" : i === cols - 1 ? "40%" : "75%" }} />
          {i === 0 && <div className="mt-1.5 h-2.5 rounded-md animate-pulse" style={{ background: "#f4f4f6", width: "45%" }} />}
        </td>
      ))}
    </tr>
  );
}

export function SkeletonRows({ count, cols }: { count: number; cols: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} cols={cols} />
      ))}
    </>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border bg-white p-5" style={{ borderColor: "#ebecef" }}>
      <div className="h-2.5 w-20 rounded-md animate-pulse" style={{ background: "#f0f0f2" }} />
      <div className="mt-3 h-7 w-28 rounded-md animate-pulse" style={{ background: "#ebebed" }} />
      <div className="mt-2 h-2.5 w-24 rounded-md animate-pulse" style={{ background: "#f4f4f6" }} />
    </div>
  );
}

export function SkeletonActivityRow() {
  return (
    <div className="flex items-center gap-4 px-6 py-3.5" style={{ borderBottom: "1px solid #f9f9fb" }}>
      <div className="h-7 w-7 shrink-0 rounded-lg animate-pulse" style={{ background: "#f0f0f2" }} />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-48 rounded-md animate-pulse" style={{ background: "#f0f0f2" }} />
        <div className="h-2.5 w-28 rounded-md animate-pulse" style={{ background: "#f4f4f6" }} />
      </div>
      <div className="h-2.5 w-12 rounded-md animate-pulse" style={{ background: "#f4f4f6" }} />
    </div>
  );
}

// Advisor list row
export function SkeletonAdvisorRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-4" style={{ borderBottom: "1px solid #f9f9fb" }}>
      <div className="h-8 w-8 shrink-0 rounded-full animate-pulse" style={{ background: "#e8eaf0" }} />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-36 rounded-md animate-pulse" style={{ background: "#f0f0f2" }} />
        <div className="h-2.5 w-52 rounded-md animate-pulse" style={{ background: "#f4f4f6" }} />
      </div>
      <div className="flex gap-2">
        <div className="h-7 w-12 rounded-lg animate-pulse" style={{ background: "#f0f0f2" }} />
        <div className="h-7 w-20 rounded-lg animate-pulse" style={{ background: "#f0f0f2" }} />
      </div>
    </div>
  );
}

// Client detail page — header + section blocks
export function SkeletonClientDetail() {
  return (
    <div className="px-8 py-8">
      {/* Back link */}
      <div className="mb-6 h-4 w-20 rounded-md animate-pulse" style={{ background: "#f0f0f2" }} />

      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-6">
        <div className="space-y-2">
          <div className="h-7 w-56 rounded-md animate-pulse" style={{ background: "#ebebed" }} />
          <div className="h-3 w-80 rounded-md animate-pulse" style={{ background: "#f0f0f2" }} />
        </div>
        <div className="h-9 w-40 rounded-xl animate-pulse" style={{ background: "#f0f0f2" }} />
      </div>

      {/* Folders section */}
      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <div className="h-3.5 w-14 rounded-md animate-pulse" style={{ background: "#f0f0f2" }} />
          <div className="h-7 w-24 rounded-lg animate-pulse" style={{ background: "#f0f0f2" }} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border bg-white p-4" style={{ borderColor: "#ebecef" }}>
              <div className="mb-3 h-4 w-24 rounded-md animate-pulse" style={{ background: "#f0f0f2" }} />
              <div className="space-y-2">
                <div className="h-3 w-full rounded-md animate-pulse" style={{ background: "#f4f4f6" }} />
                <div className="h-3 w-3/4 rounded-md animate-pulse" style={{ background: "#f4f4f6" }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notes section */}
      <div className="mb-6 rounded-2xl border bg-white p-6" style={{ borderColor: "#ebecef" }}>
        <div className="mb-4 h-3.5 w-24 rounded-md animate-pulse" style={{ background: "#f0f0f2" }} />
        <div className="h-20 w-full rounded-xl animate-pulse" style={{ background: "#f4f4f6" }} />
      </div>

      {/* Messages section */}
      <div className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: "#ebecef" }}>
        <div className="border-b px-6 py-4" style={{ borderColor: "#f3f4f6" }}>
          <div className="h-3.5 w-20 rounded-md animate-pulse" style={{ background: "#f0f0f2" }} />
        </div>
        <div className="p-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
              <div className="h-9 rounded-2xl animate-pulse" style={{ background: "#f0f0f2", width: `${40 + i * 10}%` }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
