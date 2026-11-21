/**
 * Shown the moment a dashboard link is clicked, while the next page is prepared
 * on the server. The sidebar belongs to the layout, so it stays on screen and
 * only this content area waits.
 */
export default function DashboardLoading() {
  return (
    <div
      className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-8"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="h-8 w-56 animate-pulse rounded-lg bg-slate-200" />
      <div className="mt-2 h-4 w-80 max-w-full animate-pulse rounded bg-slate-200" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="h-28 animate-pulse rounded-xl bg-white" />
        <div className="h-28 animate-pulse rounded-xl bg-white" />
        <div className="h-28 animate-pulse rounded-xl bg-white" />
      </div>
      <div className="mt-4 h-64 animate-pulse rounded-xl bg-white" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
