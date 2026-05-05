import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export type InvoiceExportData = {
  id: number;
  invoiceNumber: string;
  customerName: string;
  date: string;
  paymentMethod: string;
  paymentStatus: string;
  notes: string;
  items: {
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  totalAmount: number;
  amountPaid: number;
  remainingAmount: number;
};

export type ExportFormat = 'pdf' | 'image';

export async function captureElementAsImage(
  elementId: string
): Promise<string> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }
  
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
  });
  
  return canvas.toDataURL('image/png');
}

export async function downloadAsPDF(
  elementId: string,
  fileName: string
): Promise<void> {
  const dataUrl = await captureElementAsImage(elementId);
  
  const imgWidth = 210; // A4 width in mm
  const imgHeight = (imgWidth * 1.414) - 20; // A4 ratio with margins
  
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  pdf.addImage(dataUrl, 'PNG', 10, 10, pageWidth - 20, pageHeight - 20);
  pdf.save(`${fileName}.pdf`);
}

export async function downloadAsImage(
  elementId: string,
  fileName: string
): Promise<void> {
  const dataUrl = await captureElementAsImage(elementId);
  
  const link = document.createElement('a');
  link.download = `${fileName}.png`;
  link.href = dataUrl;
  link.click();
}

export async function exportInvoice(
  invoice: InvoiceExportData,
  format: ExportFormat
): Promise<void> {
  // Create a temporary container for rendering
  const container = document.createElement('div');
  container.id = 'invoice-export-container';
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '800px';
  container.style.backgroundColor = '#ffffff';
  container.style.padding = '40px';
  container.style.fontFamily = 'Arial, sans-serif';
  
  // Build invoice HTML content
  container.innerHTML = `
    <div style="max-width: 720px; margin: 0 auto;">
      <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1e293b; padding-bottom: 20px;">
        <h1 style="font-size: 28px; color: #1e293b; margin: 0 0 10px 0;">FACTURE</h1>
        <p style="font-size: 18px; color: #475569; margin: 0;">N° ${invoice.invoiceNumber}</p>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
        <div>
          <p style="font-size: 12px; color: #64748b; margin: 0;">Client</p>
          <p style="font-size: 16px; font-weight: bold; color: #1e293b; margin: 5px 0 0 0;">${invoice.customerName}</p>
        </div>
        <div style="text-align: right;">
          <p style="font-size: 12px; color: #64748b; margin: 0;">Date</p>
          <p style="font-size: 14px; color: #1e293b; margin: 5px 0 0 0;">${new Date(invoice.date).toLocaleDateString('fr-FR')}</p>
          <p style="font-size: 12px; color: #64748b; margin: 15px 0 0 0;">Mode paiement</p>
          <p style="font-size: 14px; color: #1e293b; margin: 5px 0 0 0;">${invoice.paymentMethod}</p>
        </div>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <thead>
          <tr style="background-color: #f1f5f9;">
            <th style="padding: 12px; text-align: left; font-size: 12px; color: #475569; border-bottom: 2px solid #e2e8f0;">Article</th>
            <th style="padding: 12px; text-align: center; font-size: 12px; color: #475569; border-bottom: 2px solid #e2e8f0;">Qté</th>
            <th style="padding: 12px; text-align: right; font-size: 12px; color: #475569; border-bottom: 2px solid #e2e8f0;">Prix Unit.</th>
            <th style="padding: 12px; text-align: right; font-size: 12px; color: #475569; border-bottom: 2px solid #e2e8f0;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${invoice.items.map(item => `
            <tr>
              <td style="padding: 12px; font-size: 14px; color: #1e293b; border-bottom: 1px solid #e2e8f0;">${item.productName}</td>
              <td style="padding: 12px; text-align: center; font-size: 14px; color: #1e293b; border-bottom: 1px solid #e2e8f0;">${item.quantity}</td>
              <td style="padding: 12px; text-align: right; font-size: 14px; color: #1e293b; border-bottom: 1px solid #e2e8f0;">${new Intl.NumberFormat('fr-FR').format(item.unitPrice)} GNF</td>
              <td style="padding: 12px; text-align: right; font-size: 14px; color: #1e293b; border-bottom: 1px solid #e2e8f0;">${new Intl.NumberFormat('fr-FR').format(item.totalPrice)} GNF</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div style="display: flex; justify-content: flex-end; margin-bottom: 30px;">
        <div style="width: 250px;">
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
            <span style="font-size: 14px; color: #475569;">Total</span>
            <span style="font-size: 16px; font-weight: bold; color: #1e293b;">${new Intl.NumberFormat('fr-FR').format(invoice.totalAmount)} GNF</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
            <span style="font-size: 14px; color: #475569;">Avance</span>
            <span style="font-size: 16px; font-weight: bold; color: #16a34a;">${new Intl.NumberFormat('fr-FR').format(invoice.amountPaid)} GNF</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
            <span style="font-size: 14px; color: #475569;">Reste</span>
            <span style="font-size: 16px; font-weight: bold; color: #ea580c;">${new Intl.NumberFormat('fr-FR').format(invoice.remainingAmount)} GNF</span>
          </div>
        </div>
      </div>
      
      ${invoice.notes ? `
        <div style="margin-top: 20px; padding: 15px; background-color: #f8fafc; border-radius: 8px;">
          <p style="font-size: 12px; color: #64748b; margin: 0 0 5px 0;">Notes</p>
          <p style="font-size: 14px; color: #1e293b; margin: 0;">${invoice.notes}</p>
        </div>
      ` : ''}
      
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
        <p style="font-size: 12px; color: #64748b; margin: 0;">Merci pour votre confiance</p>
        <p style="font-size: 14px; font-weight: bold; color: #1e293b; margin: 10px 0 0 0;">ProjectGaz</p>
      </div>
    </div>
  `;
  
  document.body.appendChild(container);
  
  try {
    if (format === 'pdf') {
      await downloadAsPDF('invoice-export-container', `facture-${invoice.invoiceNumber}`);
    } else {
      await downloadAsImage('invoice-export-container', `facture-${invoice.invoiceNumber}`);
    }
  } finally {
    document.body.removeChild(container);
  }
}