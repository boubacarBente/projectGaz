export type Period = 'today' | 'day' | 'week' | 'month' | 'year' | 'total';

export type RapportData = {
  summary: {
    totalPurchases: number;
    totalSales: number;
    grossProfit: number;
    totalBottlesSold: number;
    averageBasket: number;
    totalPurchaseInvoices: number;
    totalSalesInvoices: number;
    totalCustomers: number;
  };
  monthlyData: { month: string; purchases: number; sales: number; profit: number }[];
  soldByProduct: { productCode: string; productName: string; quantity: number; revenue: number }[];
  topCustomers: { name: string; totalSpent: number; invoiceCount: number }[];
};
