'use client';

import { memo } from 'react';
import { Modal } from '@/components/modal';
import type { SalesInvoice, Product, Customer, InvoiceLine, InvoiceFormData } from '@/lib/ventes-types';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-MA').format(value);
}

const statusLabels: Record<string, string> = {
  Paye: 'Payée',
  Payée: 'Payée',
  Partiel: 'Partiel',
  'En attente': 'En attente',
};

function getStatusColor(status: string) {
  switch (status) {
    case 'Paye':
    case 'Payée': return 'badge-primary';
    case 'Partiel': return 'badge-error';
    case 'En attente': return 'badge-primary';
    default: return 'badge-primary';
  }
}

// ─── Shared invoice form lines ────────────────────────────────────────

function InvoiceLinesTable({
  lines,
  products,
  onUpdateLine,
  onAddLine,
  onRemoveLine,
}: {
  lines: InvoiceLine[];
  products: Product[];
  onUpdateLine: (index: number, field: keyof InvoiceLine, value: string) => void;
  onAddLine: () => void;
  onRemoveLine: (index: number) => void;
}) {
  return (
    <div className="bg-base-200/30 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-sm text-base-content/70">Produits vendus</h4>
        <button type="button" onClick={onAddLine} className="btn btn-sm btn-primary btn-outline gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Ajouter
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="table table-xs">
          <thead>
            <tr>
              <th className="bg-base-100">Produit</th>
              <th className="bg-base-100 text-center">Qté</th>
              <th className="bg-base-100 text-right">Prix unit.</th>
              <th className="bg-base-100 text-right">Total</th>
              <th className="bg-base-100"></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => {
              const qty = parseFloat(line.quantity || '0');
              const price = parseFloat(line.unitPrice || '0');
              const total = qty * price;
              return (
                <tr key={index}>
                  <td>
                    <select
                      value={line.productId}
                      onChange={(e) => {
                        onUpdateLine(index, 'productId', e.target.value);
                        const p = products.find(p => p.id.toString() === e.target.value);
                        if (p) onUpdateLine(index, 'unitPrice', p.salePrice.toString());
                      }}
                      className="select select-bordered select-sm w-full focus:select-focus"
                    >
                      <option value="">Sélectionner...</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.code} - {p.name} ({p.capacity})</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number" step="any"
                      value={line.quantity}
                      onChange={(e) => onUpdateLine(index, 'quantity', e.target.value)}
                      className="input input-bordered input-sm w-20 text-center focus:input-focus"
                      min="1"
                    />
                  </td>
                  <td>
                    <input
                      type="number" step="any"
                      value={line.unitPrice}
                      onChange={(e) => onUpdateLine(index, 'unitPrice', e.target.value)}
                      className="input input-bordered input-sm w-28 text-right focus:input-focus"
                      placeholder="0"
                      min="1"
                    />
                  </td>
                  <td className="text-right font-semibold text-sky-600">
                    {line.quantity && line.unitPrice ? formatCurrency(total) + ' F' : '—'}
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => onRemoveLine(index)}
                      className="btn btn-ghost btn-sm btn-circle"
                      disabled={lines.length === 1}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="font-bold text-base">
              <td colSpan={3} className="text-right">Total général</td>
              <td className="text-right text-sky-600">
                {formatCurrency(
                  lines.reduce((sum, line) =>
                    sum + (parseFloat(line.quantity || '0') * parseFloat(line.unitPrice || '0')), 0
                  )
                )} F
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

const MemoInvoiceLinesTable = memo(InvoiceLinesTable);

// ─── Payment & Notes fields ───────────────────────────────────────────

function PaymentFields({
  formData,
  onChange,
}: {
  formData: InvoiceFormData;
  onChange: (data: InvoiceFormData) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Mode de paiement</span>
        </label>
        <select
          value={formData.paymentMethod}
          onChange={(e) => onChange({ ...formData, paymentMethod: e.target.value })}
          className="select select-bordered"
        >
          <option value="Espèces">Espèces</option>
          <option value="Virement">Virement</option>
          <option value="Carte">Carte</option>
          <option value="Chèque">Chèque</option>
        </select>
      </div>
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Montant payé</span>
        </label>
        <input
          type="number" step="any"
          value={formData.amountPaid}
          onChange={(e) => onChange({ ...formData, amountPaid: e.target.value })}
          className="input input-bordered"
          placeholder="0.00"
        />
      </div>
      <div className="form-control">
        <label className="label">
          <span className="label-text font-medium">Notes</span>
        </label>
        <input
          type="text"
          value={formData.notes}
          onChange={(e) => onChange({ ...formData, notes: e.target.value })}
          className="input input-bordered"
          placeholder="Observations..."
        />
      </div>
    </div>
  );
}

const MemoPaymentFields = memo(PaymentFields);

// ─── Add Invoice Modal ────────────────────────────────────────────────

export function AddInvoiceModal({
  isOpen,
  onClose,
  formData,
  onFormDataChange,
  products,
  customers,
  isSubmitting,
  onSubmit,
  onAddLine,
  onRemoveLine,
  onUpdateLine,
}: {
  isOpen: boolean;
  onClose: () => void;
  formData: InvoiceFormData;
  onFormDataChange: (data: InvoiceFormData) => void;
  products: Product[];
  customers: Customer[];
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onAddLine: () => void;
  onRemoveLine: (index: number) => void;
  onUpdateLine: (index: number, field: keyof InvoiceLine, value: string) => void;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nouvelle facture de vente" size="xl">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-control">
            <label className="label block">
              <span className="label-text font-medium">Client *</span>
            </label>
            <input
              type="text"
              required
              list="customers-list"
              value={formData.customerName}
              onChange={(e) => onFormDataChange({ ...formData, customerName: e.target.value })}
              className="input input-bordered"
              placeholder="Nom du client"
            />
            <datalist id="customers-list">
              {customers.map(c => <option key={c.id} value={c.name} />)}
            </datalist>
          </div>
          <div className="form-control">
            <label className="label block">
              <span className="label-text font-medium">Date</span>
            </label>
            <input type="date"
              value={formData.date}
              onChange={(e) => onFormDataChange({ ...formData, date: e.target.value })}
              className="w-full input-md"
            />
          </div>
        </div>

        <MemoInvoiceLinesTable
          lines={formData.lines}
          products={products}
          onUpdateLine={onUpdateLine}
          onAddLine={onAddLine}
          onRemoveLine={onRemoveLine}
        />

        <MemoPaymentFields formData={formData} onChange={onFormDataChange} />

        <div className="flex justify-end gap-3 pt-4 border-t border-base-200">
          <button type="button" onClick={onClose} className="btn btn-ghost">Annuler</button>
          <button type="submit" disabled={isSubmitting} className="btn btn-primary">
            {isSubmitting ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Créer la facture
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Edit Invoice Modal ───────────────────────────────────────────────

export function EditInvoiceModal({
  isOpen,
  onClose,
  formData,
  onFormDataChange,
  products,
  customers,
  isSubmitting,
  onSubmit,
  onAddLine,
  onRemoveLine,
  onUpdateLine,
  invoiceNumber,
}: {
  isOpen: boolean;
  onClose: () => void;
  formData: InvoiceFormData;
  onFormDataChange: (data: InvoiceFormData) => void;
  products: Product[];
  customers: Customer[];
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onAddLine: () => void;
  onRemoveLine: (index: number) => void;
  onUpdateLine: (index: number, field: keyof InvoiceLine, value: string) => void;
  invoiceNumber?: string;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Modifier: ${invoiceNumber ?? ''}`} size="xl">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-control">
            <label className="label block">
              <span className="label-text font-medium">Client *</span>
            </label>
            <select
              required
              value={formData.customerName}
              onChange={(e) => onFormDataChange({ ...formData, customerName: e.target.value })}
              className="select select-bordered"
            >
              <option value="">Sélectionner un client...</option>
              {customers.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="form-control">
            <label className="label block">
              <span className="label-text font-medium">Date</span>
            </label>
            <input type="date"
              value={formData.date}
              onChange={(e) => onFormDataChange({ ...formData, date: e.target.value })}
              className="w-full input-md"
            />
          </div>
        </div>

        <MemoInvoiceLinesTable
          lines={formData.lines}
          products={products}
          onUpdateLine={onUpdateLine}
          onAddLine={onAddLine}
          onRemoveLine={onRemoveLine}
        />

        <MemoPaymentFields formData={formData} onChange={onFormDataChange} />

        <div className="flex justify-end gap-3 pt-4 border-t border-base-200">
          <button type="button" onClick={onClose} className="btn btn-ghost">Annuler</button>
          <button type="submit" disabled={isSubmitting} className="btn btn-primary">
            {isSubmitting ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Enregistrer
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Detail Invoice Modal ─────────────────────────────────────────────

export function DetailInvoiceModal({
  isOpen,
  onClose,
  invoice,
}: {
  isOpen: boolean;
  onClose: () => void;
  invoice: SalesInvoice | null;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Facture ${invoice?.invoiceNumber}`} size="lg">
      {invoice && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-base-content/60">Client:</span>
              <p className="font-medium">{invoice.customerName}</p>
            </div>
            <div>
              <span className="text-base-content/60">Date:</span>
              <p className="font-medium">{new Date(invoice.date).toLocaleDateString('fr-MA')}</p>
            </div>
            <div>
              <span className="text-base-content/60">Mode paiement:</span>
              <p className="font-medium">{invoice.paymentMethod}</p>
            </div>
            <div>
              <span className="text-base-content/60">Statut:</span>
              <span className={`badge ${getStatusColor(invoice.paymentStatus)} badge-sm ml-1`}>
                {statusLabels[invoice.paymentStatus] ?? invoice.paymentStatus}
              </span>
            </div>
          </div>

          <div className="border-t border-b border-base-200 py-4">
            <h4 className="font-medium mb-3">Articles</h4>
            <div className="overflow-x-auto">
              <table className="table table-xs w-full">
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th className="text-right">Qté</th>
                    <th className="text-right">Prix</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.productName}</td>
                      <td className="text-right whitespace-nowrap">{item.quantity}</td>
                      <td className="text-right whitespace-nowrap">{formatCurrency(item.unitPrice)}</td>
                      <td className="text-right font-medium whitespace-nowrap">{formatCurrency(item.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center p-3 bg-base-200 rounded-lg">
              <div className="text-base-content/60 text-xs">Total</div>
              <div className="font-semibold text-lg">{formatCurrency(invoice.totalAmount)}</div>
            </div>
            <div className="text-center p-3 bg-sky-50 rounded-lg">
              <div className="text-base-content/60 text-xs">Coût de revient</div>
              <div className="font-semibold text-lg text-info">{formatCurrency(invoice.costOfGoodsSold ?? 0)}</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-base-content/60 text-xs">Encaisse</div>
              <div className="font-semibold text-lg text-success">{formatCurrency(invoice.amountPaid)}</div>
            </div>
            <div className={`text-center p-3 rounded-lg ${(invoice.grossProfit ?? 0) >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
              <div className="text-base-content/60 text-xs">Bénéfice</div>
              <div className={`font-semibold text-lg ${(invoice.grossProfit ?? 0) >= 0 ? 'text-success' : 'text-error'}`}>
                {formatCurrency(invoice.grossProfit ?? 0)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 text-sm">
            <div className="text-center p-3 bg-amber-50 rounded-lg">
              <div className="text-base-content/60 text-xs">Reste</div>
              <div className="font-semibold text-lg text-warning">{formatCurrency(invoice.remainingAmount)}</div>
            </div>
          </div>

          {invoice.notes && (
            <div className="text-sm text-base-content/60">
              <span className="font-medium">Notes:</span> {invoice.notes}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

// ─── Delete Confirmation Modal ────────────────────────────────────────

export function DeleteInvoiceModal({
  isOpen,
  onClose,
  invoice,
  isSubmitting,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  invoice: SalesInvoice | null;
  isSubmitting: boolean;
  onConfirm: () => void;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirmer la suppression" size="sm">
      <div className="py-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-error/10 p-3 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-base-content/70">
            Êtes-vous sûr de vouloir supprimer la facture <strong>{invoice?.invoiceNumber}</strong> ?
            <br />
            <span className="text-sm">Cette action est irréversible.</span>
          </p>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-base-200">
          <button type="button" onClick={onClose} className="btn btn-ghost">Annuler</button>
          <button onClick={onConfirm} disabled={isSubmitting} className="btn btn-primary">
            {isSubmitting ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Supprimer
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
