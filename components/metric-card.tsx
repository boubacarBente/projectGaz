type MetricCardProps = {
  label: string;
  value: string;
  hint: string;
};

export function MetricCard({ label, value, hint }: MetricCardProps) {
  return (
    <div className="metric-card rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/60 dark:border-slate-700/80 dark:bg-slate-900 dark:shadow-slate-800/60">
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{hint}</p>
    </div>
  );
}
