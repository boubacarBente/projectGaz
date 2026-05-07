import { ReactNode } from "react";

type SurfaceCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export function SurfaceCard({
  title,
  description,
  children,
}: SurfaceCardProps) {
  return (
    <section className="surface-card rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-6 shadow-md shadow-slate-200/60 backdrop-blur dark:border-slate-700/80 dark:bg-slate-900/85 dark:shadow-slate-800/60">
      <div className="mb-5 space-y-1">
        <h3 className="text-lg font-semibold text-slate-950 dark:text-white">{title}</h3>
        {description ? (
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
