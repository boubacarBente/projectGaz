export default function ClientLoading() {
  return (
    <div className="space-y-4">
      <div className="h-28 animate-pulse rounded-4xl bg-white/80" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-64 animate-pulse rounded-[1.75rem] bg-white/80" />
        <div className="h-64 animate-pulse rounded-[1.75rem] bg-white/80" />
      </div>
    </div>
  );
}
