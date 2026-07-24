'use client';

import { toast } from 'react-toastify';

import { ExportDropdown } from '@/components/export-dropdown';
import type { LinkedSalesInvoice } from '@/lib/ventes-types';

type PurchaseInvoiceReportItem = {
  productId: number;
  productCode: string;
  productName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
};

type PurchaseInvoiceReport = {
  id: number;
  reference: string;
  supplierName: string;
  date: string;
  notes: string;
  items: PurchaseInvoiceReportItem[];
  totalAmount: number;
  isPaid: boolean;
  createdAt: string;
};

type ProductReportRow = {
  key: string;
  productCode: string;
  productName: string;
  purchasedQuantity: number;
  soldQuantity: number;
  totalCost: number;
  linkedRevenue: number;
};

type PurchaseInvoiceReportExportProps = {
  invoice: PurchaseInvoiceReport;
  linkedSales: LinkedSalesInvoice[];
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR').format(value);
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('fr-FR');
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getFileReference(reference: string) {
  return reference.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, '-');
}

function summarizeSaleItems(items: LinkedSalesInvoice['items']) {
  const quantitiesByCode = new Map<string, number>();

  for (const item of items) {
    const code = item.productCode || item.productName;
    quantitiesByCode.set(code, (quantitiesByCode.get(code) ?? 0) + item.quantity);
  }

  return Array.from(quantitiesByCode.entries())
    .map(([code, quantity]) => `${escapeHtml(code)} x${quantity}`)
    .join(', ');
}

function buildProductRows(
  invoice: PurchaseInvoiceReport,
  linkedSales: LinkedSalesInvoice[],
) {
  const rows = new Map<string, ProductReportRow>();

  for (const item of invoice.items) {
    const key = String(item.productId);
    const row = rows.get(key) ?? {
      key,
      productCode: item.productCode,
      productName: item.productName,
      purchasedQuantity: 0,
      soldQuantity: 0,
      totalCost: 0,
      linkedRevenue: 0,
    };

    row.productCode = item.productCode;
    row.productName = item.productName;
    row.purchasedQuantity += item.quantity;
    row.totalCost += item.totalCost;
    rows.set(key, row);
  }

  for (const sale of linkedSales) {
    for (const item of sale.items) {
      const key = String(item.productId);
      const row = rows.get(key) ?? {
        key,
        productCode: item.productCode,
        productName: item.productName,
        purchasedQuantity: 0,
        soldQuantity: 0,
        totalCost: 0,
        linkedRevenue: 0,
      };

      row.soldQuantity += item.quantity;
      row.linkedRevenue += item.totalPrice;
      rows.set(key, row);
    }
  }

  return Array.from(rows.values()).sort((a, b) =>
    a.productCode.localeCompare(b.productCode, 'fr'),
  );
}

function buildReportHTML(invoice: PurchaseInvoiceReport, linkedSales: LinkedSalesInvoice[]) {
  const productRows = buildProductRows(invoice, linkedSales);
  const purchasedQuantity = invoice.items.reduce((sum, item) => sum + item.quantity, 0);
  const soldQuantity = linkedSales.reduce(
    (sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
    0,
  );
  const linkedSalesTotal = linkedSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const linkedSalesPaid = linkedSales.reduce((sum, sale) => sum + sale.amountPaid, 0);
  const linkedSalesRemaining = linkedSales.reduce((sum, sale) => sum + sale.remainingAmount, 0);
  const estimatedMargin = linkedSalesTotal - invoice.totalAmount;
  const generatedAt = new Date().toLocaleString('fr-FR');

  const purchaseRowsHTML = invoice.items.map((item) => `
    <tr>
      <td>${escapeHtml(item.productName)} <span class="muted">(${escapeHtml(item.productCode)})</span></td>
      <td class="num">${item.quantity}</td>
      <td class="num">${formatCurrency(item.unitCost)} GNF</td>
      <td class="num">${formatCurrency(item.totalCost)} GNF</td>
    </tr>
  `).join('');

  const productRowsHTML = productRows.map((row) => {
    const remaining = row.purchasedQuantity - row.soldQuantity;

    return `
      <tr>
        <td>${escapeHtml(row.productName)} <span class="muted">(${escapeHtml(row.productCode)})</span></td>
        <td class="num">${row.purchasedQuantity}</td>
        <td class="num">${row.soldQuantity}</td>
        <td class="num">${remaining}</td>
        <td class="num">${formatCurrency(row.totalCost)} GNF</td>
        <td class="num">${formatCurrency(row.linkedRevenue)} GNF</td>
      </tr>
    `;
  }).join('');

  const salesRowsHTML = linkedSales.length > 0
    ? linkedSales.map((sale) => `
      <tr>
        <td>${formatDate(sale.date)}</td>
        <td>${escapeHtml(sale.invoiceNumber)}</td>
        <td>${escapeHtml(sale.customerName)}</td>
        <td>${summarizeSaleItems(sale.items) || 'Aucun article'}</td>
        <td class="num">${formatCurrency(sale.totalAmount)} GNF</td>
        <td class="num success">${formatCurrency(sale.amountPaid)} GNF</td>
        <td class="num warning">${formatCurrency(sale.remainingAmount)} GNF</td>
        <td><span class="badge">${escapeHtml(sale.paymentStatus)}</span></td>
      </tr>
    `).join('')
    : '<tr><td colspan="8" class="empty">Aucune vente liee a cette facture usine.</td></tr>';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        * { box-sizing: border-box; }
        body {
          margin: 0;
          background: #ffffff;
          color: #172033;
          font-family: Arial, Helvetica, sans-serif;
          padding: 38px;
        }
        .report {
          width: 880px;
          margin: 0 auto;
        }
        .header {
          display: flex;
          justify-content: space-between;
          gap: 24px;
          border-bottom: 3px solid #172033;
          padding-bottom: 22px;
          margin-bottom: 24px;
        }
        .eyebrow {
          color: #0f766e;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: .12em;
          margin: 0 0 8px;
          text-transform: uppercase;
        }
        h1 {
          font-size: 30px;
          line-height: 1.15;
          margin: 0;
        }
        h2 {
          color: #172033;
          font-size: 17px;
          margin: 0 0 12px;
        }
        .meta {
          min-width: 260px;
          text-align: right;
          color: #475569;
          font-size: 13px;
          line-height: 1.7;
        }
        .summary {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 22px;
        }
        .tile {
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 13px;
          min-height: 82px;
        }
        .tile span {
          color: #64748b;
          display: block;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .04em;
          margin-bottom: 7px;
          text-transform: uppercase;
        }
        .tile strong {
          color: #111827;
          display: block;
          font-size: 18px;
          line-height: 1.25;
        }
        .grid {
          display: grid;
          grid-template-columns: 1.1fr .9fr;
          gap: 16px;
          margin-bottom: 22px;
        }
        .box {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
          break-inside: avoid;
        }
        .line {
          display: flex;
          justify-content: space-between;
          gap: 18px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 13px;
          padding: 8px 0;
        }
        .line:last-child { border-bottom: 0; }
        .muted { color: #64748b; }
        .success { color: #059669; }
        .warning { color: #d97706; }
        .danger { color: #dc2626; }
        table {
          border-collapse: collapse;
          font-size: 12px;
          margin-bottom: 22px;
          width: 100%;
        }
        th {
          background: #f1f5f9;
          border-bottom: 2px solid #dbe3ef;
          color: #475569;
          font-size: 11px;
          padding: 10px;
          text-align: left;
          text-transform: uppercase;
        }
        td {
          border-bottom: 1px solid #e2e8f0;
          padding: 10px;
          vertical-align: top;
        }
        tfoot td {
          border-bottom: 0;
          font-weight: 700;
        }
        .num {
          text-align: right;
          white-space: nowrap;
        }
        .badge {
          background: #eef2ff;
          border-radius: 999px;
          color: #1d4ed8;
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 8px;
          white-space: nowrap;
        }
        .section {
          break-inside: avoid;
          margin-top: 24px;
        }
        .empty {
          color: #64748b;
          padding: 18px;
          text-align: center;
        }
        .footer {
          border-top: 1px solid #e2e8f0;
          color: #64748b;
          font-size: 11px;
          margin-top: 28px;
          padding-top: 14px;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <main class="report">
        <section class="header">
          <div>
            <p class="eyebrow">Rapport complet facture usine</p>
            <h1>${escapeHtml(invoice.reference)}</h1>
            <p class="muted" style="margin: 10px 0 0;">${escapeHtml(invoice.supplierName)} - ${formatDate(invoice.date)}</p>
          </div>
          <div class="meta">
            <div>ProjectGaz</div>
            <div>Genere le ${escapeHtml(generatedAt)}</div>
            <div>Statut achat: <strong style="color:#172033;">${invoice.isPaid ? 'Payee' : 'En attente'}</strong></div>
          </div>
        </section>

        <section class="summary">
          <div class="tile"><span>Total achat</span><strong>${formatCurrency(invoice.totalAmount)} GNF</strong></div>
          <div class="tile"><span>Ventes liees</span><strong>${linkedSales.length}</strong></div>
          <div class="tile"><span>Total ventes</span><strong>${formatCurrency(linkedSalesTotal)} GNF</strong></div>
          <div class="tile"><span>Marge estimee</span><strong class="${estimatedMargin >= 0 ? 'success' : 'danger'}">${formatCurrency(estimatedMargin)} GNF</strong></div>
          <div class="tile"><span>Bouteilles achetees</span><strong>${purchasedQuantity}</strong></div>
          <div class="tile"><span>Bouteilles vendues</span><strong>${soldQuantity}</strong></div>
          <div class="tile"><span>Encaisse ventes</span><strong class="success">${formatCurrency(linkedSalesPaid)} GNF</strong></div>
          <div class="tile"><span>Reste ventes</span><strong class="warning">${formatCurrency(linkedSalesRemaining)} GNF</strong></div>
        </section>

        <section class="grid">
          <div class="box">
            <h2>Informations fournisseur</h2>
            <div class="line"><span class="muted">Fournisseur</span><strong>${escapeHtml(invoice.supplierName)}</strong></div>
            <div class="line"><span class="muted">Reference</span><strong>${escapeHtml(invoice.reference)}</strong></div>
            <div class="line"><span class="muted">Date facture</span><strong>${formatDate(invoice.date)}</strong></div>
            <div class="line"><span class="muted">Paiement usine</span><strong>${invoice.isPaid ? 'Payee' : 'En attente'}</strong></div>
          </div>
          <div class="box">
            <h2>Notes</h2>
            <p style="font-size:13px;line-height:1.6;margin:0;">${invoice.notes ? escapeHtml(invoice.notes) : 'Aucune note.'}</p>
          </div>
        </section>

        <section class="section">
          <h2>Articles achetes</h2>
          <table>
            <thead>
              <tr>
                <th>Produit</th>
                <th class="num">Qte</th>
                <th class="num">Cout unit.</th>
                <th class="num">Total</th>
              </tr>
            </thead>
            <tbody>${purchaseRowsHTML}</tbody>
            <tfoot>
              <tr>
                <td colspan="3" class="num">Total achat</td>
                <td class="num">${formatCurrency(invoice.totalAmount)} GNF</td>
              </tr>
            </tfoot>
          </table>
        </section>

        <section class="section">
          <h2>Synthese par produit</h2>
          <table>
            <thead>
              <tr>
                <th>Produit</th>
                <th class="num">Achete</th>
                <th class="num">Vendu lie</th>
                <th class="num">Reste</th>
                <th class="num">Cout achat</th>
                <th class="num">Ventes liees</th>
              </tr>
            </thead>
            <tbody>${productRowsHTML}</tbody>
          </table>
        </section>

        <section class="section">
          <h2>Historique des ventes liees</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Facture</th>
                <th>Client</th>
                <th>Articles</th>
                <th class="num">Total</th>
                <th class="num">Encaisse</th>
                <th class="num">Reste</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>${salesRowsHTML}</tbody>
            <tfoot>
              <tr>
                <td colspan="4" class="num">Totaux ventes liees</td>
                <td class="num">${formatCurrency(linkedSalesTotal)} GNF</td>
                <td class="num success">${formatCurrency(linkedSalesPaid)} GNF</td>
                <td class="num warning">${formatCurrency(linkedSalesRemaining)} GNF</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </section>

        <p class="footer">Rapport genere depuis Gestion Gaz - Facture usine ${escapeHtml(invoice.reference)}</p>
      </main>
    </body>
    </html>
  `;
}

async function renderReportCanvas(html: string) {
  const [{ default: html2canvas }] = await Promise.all([
    import('html2canvas'),
  ]);

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:960px;height:1400px;border:none;background:#fff;';
  document.body.appendChild(iframe);

  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) throw new Error('Cannot access iframe document');

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    await Promise.all(
      Array.from(iframeDoc.images).map((image) => {
        if (image.complete) return Promise.resolve();

        return new Promise<void>((resolve) => {
          image.addEventListener('load', () => resolve(), { once: true });
          image.addEventListener('error', () => resolve(), { once: true });
        });
      }),
    );

    return await html2canvas(iframeDoc.body, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: 'rgb(255,255,255)',
      logging: false,
      windowWidth: iframeDoc.documentElement.scrollWidth,
      windowHeight: iframeDoc.documentElement.scrollHeight,
    });
  } finally {
    document.body.removeChild(iframe);
  }
}

export function PurchaseInvoiceReportExport({
  invoice,
  linkedSales,
}: PurchaseInvoiceReportExportProps) {
  const fileBase = `rapport-facture-usine-${getFileReference(invoice.reference)}`;

  const handleExportImage = async () => {
    try {
      toast.info("Generation de l'image en cours...");
      const canvas = await renderReportCanvas(buildReportHTML(invoice, linkedSales));
      const link = document.createElement('a');
      link.download = `${fileBase}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Image telechargee avec succes!');
    } catch (error) {
      console.error('Purchase invoice report image export error:', error);
      toast.error("Erreur lors de la generation de l'image");
    }
  };

  const handleExportPDF = async () => {
    try {
      toast.info('Generation du PDF en cours...');
      const [{ default: jsPDF }, canvas] = await Promise.all([
        import('jspdf'),
        renderReportCanvas(buildReportHTML(invoice, linkedSales)),
      ]);

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imgWidth = pageWidth - (margin * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pageContentHeight = pageHeight - (margin * 2);
      const imgData = canvas.toDataURL('image/png');

      let heightLeft = imgHeight;
      let y = margin;

      pdf.addImage(imgData, 'PNG', margin, y, imgWidth, imgHeight);
      heightLeft -= pageContentHeight;

      while (heightLeft > 0) {
        pdf.addPage();
        y = margin - (imgHeight - heightLeft);
        pdf.addImage(imgData, 'PNG', margin, y, imgWidth, imgHeight);
        heightLeft -= pageContentHeight;
      }

      pdf.save(`${fileBase}.pdf`);
      toast.success('PDF telecharge avec succes!');
    } catch (error) {
      console.error('Purchase invoice report PDF export error:', error);
      toast.error('Erreur lors de la generation du PDF');
    }
  };

  return (
    <ExportDropdown
      onExportPDF={handleExportPDF}
      onExportImage={handleExportImage}
      label="Export rapport"
    />
  );
}
