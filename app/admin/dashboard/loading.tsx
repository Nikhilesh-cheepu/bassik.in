export default function AdminDashboardLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 pt-10">
        <div className="h-7 w-44 animate-pulse rounded bg-slate-200" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-slate-200" />
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          ))}
        </div>
      </div>
    </div>
  );
}
