type PurchasePaymentStatusBadgeProps = {
  isPaid: boolean;
  className?: string;
};

export function PurchasePaymentStatusBadge({
  isPaid,
  className = '',
}: PurchasePaymentStatusBadgeProps) {
  const tone = isPaid ? 'badge-success' : 'badge-warning';
  const label = isPaid ? 'Payée' : 'Non payée';

  return (
    <span
      className={`badge badge-soft ${tone} badge-sm h-6 min-h-6 gap-1.5 whitespace-nowrap px-2.5 text-xs font-semibold align-middle ${className}`.trim()}
      aria-label={`Facture ${label.toLowerCase()}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
      {label}
    </span>
  );
}
