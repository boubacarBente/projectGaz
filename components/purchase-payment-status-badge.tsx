type PurchasePaymentStatusBadgeProps = {
  isPaid: boolean;
  className?: string;
};

export function PurchasePaymentStatusBadge({
  isPaid,
  className = '',
}: PurchasePaymentStatusBadgeProps) {
  const tone = isPaid
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-rose-200 bg-rose-50 text-rose-700';
  const label = isPaid ? 'Payée' : 'En attente';

  return (
    <span
      className={`inline-flex h-7 min-w-[6.25rem] items-center justify-center gap-2 whitespace-nowrap rounded-full border px-3 text-xs font-semibold leading-none align-middle ${tone} ${className}`.trim()}
      aria-label={`Facture ${label.toLowerCase()}`}
    >
      <span className="h-2 w-2 shrink-0 rounded-full bg-current opacity-80" aria-hidden="true" />
      {label}
    </span>
  );
}
