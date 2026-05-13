type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <section className="rounded-4xl border border-base-200/80 bg-base-100/80 p-6 shadow-lg shadow-black/5 backdrop-blur md:p-8 dark:border-slate-700/80 dark:bg-slate-900/75 dark:shadow-slate-800/60">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-400 dark:text-sky-300">
            {eyebrow}
          </p>
          <div className="space-y-2">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white md:text-4xl">
              {title}
            </h2>
            <p className="max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-400 md:text-base">
              {description}
            </p>
          </div>
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
    </section>
  );
}
