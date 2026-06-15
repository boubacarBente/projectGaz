export type Period = 'today' | 'day' | 'week' | 'month' | 'year' | 'total';

export type SalesInvoiceItem = {
  productId: number;
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export type SalesInvoice = {
  id: number;
  invoiceNumber: string;
  customerName: string;
  date: string;
  paymentMethod: string;
  notes: string;
  items: SalesInvoiceItem[];
  totalAmount: number;
  amountPaid: number;
  remainingAmount: number;
  costOfGoodsSold?: number;
  grossProfit?: number;
  paymentStatus: 'Payée' | 'Partiel' | 'En attente';
  createdAt: string;
};

export type Product = {
  id: number;
  code: string;
  name: string;
  capacity: string;
  unitPrice: number;
  salePrice: number;
};

export type Customer = {
  id: number;
  name: string;
};

export type VentesStats = {
  total: { total: number; paid: number; remaining: number; count: number; paidCount: number };
  byStatus: Array<{ status: string; count: number; total: number }>;
  byCustomer: Array<{ name: string; count: number; total: number; paid: number }>;
  byPeriod: Array<{ label: string; total: number; paid: number; count: number }> | null;
  recentInvoices: Array<{
    id: number; invoiceNumber: string; customerName: string; date: string;
    totalAmount: number; amountPaid: number; remainingAmount: number; paymentStatus: string;
  }>;
  dailyAvg: number;
};

export type InvoiceLine = {
  productId: string;
  quantity: string;
  unitPrice: string;
};

export type InvoiceFormData = {
  customerName: string;
  date: string;
  paymentMethod: string;
  notes: string;
  amountPaid: string;
  lines: InvoiceLine[];
};
