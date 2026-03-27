import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { SurfaceCard } from "@/components/surface-card";

type ModulePageProps = {
  eyebrow: string;
  title: string;
  description: string;
  primaryAction?: { href: string; label: string };
  highlights: string[];
  nextSteps: string[];
};

export function ModulePage({
  eyebrow,
  title,
  description,
  primaryAction,
  highlights,
  nextSteps,
}: ModulePageProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={
          primaryAction ? (
            <Link
              href={primaryAction.href}
              className="rounded-full bg-sky-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-800"
            >
              {primaryAction.label}
            </Link>
          ) : undefined
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <SurfaceCard
          title="Elements prevus dans le cahier des charges"
          description="Base d'ecran creee pour accueillir le futur module complet."
        >
          <ul className="space-y-3 text-sm leading-7 text-slate-700">
            {highlights.map((item) => (
              <li
                key={item}
                className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
              >
                {item}
              </li>
            ))}
          </ul>
        </SurfaceCard>

        <SurfaceCard
          title="Prochaines etapes"
          description="Suggestions de construction pour brancher les donnees et les formulaires."
        >
          <ol className="space-y-3 text-sm leading-7 text-slate-700">
            {nextSteps.map((item, index) => (
              <li
                key={item}
                className="flex gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-800">
                  {index + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </SurfaceCard>
      </div>
    </div>
  );
}
