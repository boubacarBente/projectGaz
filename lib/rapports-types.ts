export type Period = 'today' | 'day' | 'week' | 'month' | 'year' | 'custom' | 'total';

export type RapportPaymentStatus = 'all' | 'paid' | 'partial' | 'pending' | 'unpaid';

export type RapportFilters = {
  from?: string;
  to?: string;
  previousFrom?: string;
  previousTo?: string;
  productId?: number;
  customerId?: number;
  supplierId?: number;
  paymentStatus?: RapportPaymentStatus;
};

export type RapportMetricSnapshot = {
  totalPurchases: number;
  totalSales: number;
  grossProfit: number;
  totalBottlesSold: number;
  totalReceivables: number;
  totalPayables: number;
};

export type RapportMetricChanges = {
  totalPurchases: number;
  totalSales: number;
  grossProfit: number;
  totalBottlesSold: number;
  totalReceivables: number;
  totalPayables: number;
};

export type RapportData = {
  summary: {
    totalPurchases: number;
    totalSales: number;
    grossProfit: number;
    grossMarginRate: number;
    totalBottlesSold: number;
    averageBasket: number;
    totalPurchaseInvoices: number;
    totalSalesInvoices: number;
    totalCustomers: number;
    totalReceivables: number;
    totalPayables: number;
  };
  comparison: {
    previousFrom?: string;
    previousTo?: string;
    current: RapportMetricSnapshot;
    previous: RapportMetricSnapshot;
    changes: RapportMetricChanges;
  } | null;
  monthlyData: { month: string; purchases: number; sales: number; profit: number }[];
  soldByProduct: { productCode: string; productName: string; quantity: number; revenue: number }[];
  productMargins: {
    productId: number;
    productCode: string;
    productName: string;
    quantity: number;
    revenue: number;
    estimatedCost: number;
    grossProfit: number;
    marginRate: number;
    stock: number;
    stockMin: number;
  }[];
  topCustomers: { customerId: number | null; name: string; totalSpent: number; invoiceCount: number; remainingAmount: number }[];
  receivables: {
    customerId: number | null;
    customerName: string;
    invoiceCount: number;
    totalAmount: number;
    amountPaid: number;
    remainingAmount: number;
    lastInvoiceDate: string;
  }[];
  payables: {
    supplierId: number | null;
    supplierName: string;
    invoiceCount: number;
    totalAmount: number;
    lastInvoiceDate: string;
  }[];
  stockInsights: {
    totalStock: number;
    totalStockValue: number;
    totalSaleValue: number;
    lowStockCount: number;
    outOfStockCount: number;
    fastestMovingProducts: {
      productId: number;
      productCode: string;
      productName: string;
      quantity: number;
      stock: number;
    }[];
    slowMovingProducts: {
      productId: number;
      productCode: string;
      productName: string;
      stock: number;
      stockValue: number;
    }[];
    reorderSuggestions: {
      productId: number;
      productCode: string;
      productName: string;
      stock: number;
      stockMin: number;
      suggestedOrder: number;
    }[];
  };
  decisionSummary: {
    bestProduct: { productCode: string; productName: string; revenue: number; quantity: number } | null;
    bestCustomer: { name: string; totalSpent: number } | null;
    totalReceivables: number;
    totalPayables: number;
    lowStockCount: number;
    grossMarginRate: number;
  };
};
