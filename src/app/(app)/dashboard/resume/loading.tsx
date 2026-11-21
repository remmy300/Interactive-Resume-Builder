export default function LoadingPage() {
  return (
    <main className="min-h-screen bg-slate-100" aria-busy="true" aria-live="polite">
      <div className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto h-9 max-w-[1600px] animate-pulse rounded-lg bg-slate-200" />
      </div>
      <div className="mx-auto grid max-w-[1600px] gap-5 px-4 pt-4 lg:grid-cols-[minmax(360px,440px)_minmax(0,1fr)]">
        <div className="space-y-3">
          <div className="h-40 animate-pulse rounded-xl bg-white" />
          <div className="h-14 animate-pulse rounded-xl bg-white" />
          <div className="h-14 animate-pulse rounded-xl bg-white" />
        </div>
        <div className="h-[70vh] animate-pulse rounded-xl bg-white" />
      </div>
      <span className="sr-only">Loading your resumes…</span>
    </main>
  );
}
