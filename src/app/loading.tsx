export default function GlobalLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-150">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/80 mb-6">
        <div className="space-y-2.5">
          <div className="h-5 w-44 rounded-full bg-blue-100/70 animate-pulse" />
          <div className="h-8 w-72 sm:w-96 rounded-2xl bg-slate-200/80 animate-pulse" />
          <div className="h-4 w-64 sm:w-80 rounded-xl bg-slate-100 animate-pulse" />
        </div>
        <div className="h-10 w-64 rounded-2xl bg-slate-200/70 animate-pulse" />
      </div>

      {/* Cards Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center space-x-3.5">
                <div className="w-14 h-14 rounded-2xl bg-slate-200/80 animate-pulse" />
                <div className="space-y-2">
                  <div className="h-5 w-32 rounded-lg bg-slate-200/80 animate-pulse" />
                  <div className="h-3.5 w-24 rounded-lg bg-slate-100 animate-pulse" />
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 animate-pulse" />
            </div>

            <div className="flex gap-2">
              <div className="h-6 w-24 rounded-lg bg-slate-100 animate-pulse" />
              <div className="h-6 w-28 rounded-lg bg-slate-100 animate-pulse" />
            </div>

            <div className="space-y-2 pt-2">
              <div className="h-3.5 w-full rounded bg-slate-100 animate-pulse" />
              <div className="h-3.5 w-4/5 rounded bg-slate-100 animate-pulse" />
            </div>

            <div className="pt-4 border-t border-slate-100 flex gap-2">
              <div className="h-9 flex-1 rounded-xl bg-slate-100 animate-pulse" />
              <div className="h-9 w-20 rounded-xl bg-blue-50 animate-pulse" />
              <div className="h-9 flex-1 rounded-xl bg-blue-200/60 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
