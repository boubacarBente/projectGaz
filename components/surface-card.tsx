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
    <section className="rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-6 shadow-md shadow-slate-200/60 backdrop-blur">
      <div className="mb-5 space-y-1">
        <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
        {description ? (
          <p className="text-sm leading-6 text-slate-600">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
