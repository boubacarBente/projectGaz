import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// Types de clients
export const customerTypes = sqliteTable('customer_types', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Table des clients
export const customers = sqliteTable('customers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  city: text('city'),
  typeId: integer('type_id').references(() => customerTypes.id),
  totalPurchases: real('total_purchases').default(0),
  notes: text('notes'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Table des produits
export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  capacity: text('capacity').notNull(),
  unitPrice: real('unit_price').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Table des factures d'achat (dépenses)
export const purchaseInvoices = sqliteTable('purchase_invoices', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  reference: text('reference').notNull(),
  supplier: text('supplier').notNull(),
  date: text('date').notNull(),
  notes: text('notes'),
  totalAmount: real('total_amount').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Items des factures d'achat
export const purchaseInvoiceItems = sqliteTable('purchase_invoice_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  invoiceId: integer('invoice_id').references(() => purchaseInvoices.id).notNull(),
  productId: integer('product_id').references(() => products.id).notNull(),
  productCode: text('product_code').notNull(),
  productName: text('product_name').notNull(),
  quantity: integer('quantity').notNull(),
  unitCost: real('unit_cost').notNull(),
  totalCost: real('total_cost').notNull(),
});

// Table des factures de vente
export const salesInvoices = sqliteTable('sales_invoices', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  invoiceNumber: text('invoice_number').notNull(),
  customerName: text('customer_name').notNull(),
  date: text('date').notNull(),
  paymentMethod: text('payment_method').default('Espèces'),
  notes: text('notes'),
  totalAmount: real('total_amount').default(0),
  amountPaid: real('amount_paid').default(0),
  remainingAmount: real('remaining_amount').default(0),
  paymentStatus: text('payment_status').default('En attente'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Items des factures de vente
export const salesInvoiceItems = sqliteTable('sales_invoice_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  invoiceId: integer('invoice_id').references(() => salesInvoices.id).notNull(),
  productId: integer('product_id').references(() => products.id).notNull(),
  productCode: text('product_code').notNull(),
  productName: text('product_name').notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: real('unit_price').notNull(),
  totalPrice: real('total_price').notNull(),
});

// Table du stock
export const stock = sqliteTable('stock', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id').references(() => products.id).notNull(),
  productCode: text('product_code').notNull(),
  productName: text('product_name').notNull(),
  capacity: text('capacity').notNull(),
  currentStock: integer('current_stock').default(0),
  minStock: integer('min_stock').default(10),
  lastEntry: text('last_entry'),
  lastExit: text('last_exit'),
});

// Mouvements de stock
export const stockMovements = sqliteTable('stock_movements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id').references(() => products.id).notNull(),
  productCode: text('product_code').notNull(),
  productName: text('product_name').notNull(),
  type: text('type').notNull(), // 'entry', 'exit', 'adjustment', 'return'
  quantity: integer('quantity').notNull(),
  reference: text('reference').notNull(),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Paramètres
export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  companyName: text('company_name').default('Mini-Centre Distribution'),
  companyAddress: text('company_address'),
  companyPhone: text('company_phone'),
  companyEmail: text('company_email'),
  defaultMinStock: integer('default_min_stock').default(10),
  currency: text('currency').default('MAD'),
  currencySymbol: text('currency_symbol').default('MAD'),
  dateFormat: text('date_format').default('DD/MM/YYYY'),
  invoicePrefix: text('invoice_prefix').default('FAC'),
  purchasePrefix: text('purchase_prefix').default('ACH'),
  lowStockAlertEnabled: integer('low_stock_alert_enabled', { mode: 'boolean' }).default(true),
  theme: text('theme').default('light'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Relations
export const customerRelations = relations(customers, ({ one }) => ({
  type: one(customerTypes, {
    fields: [customers.typeId],
    references: [customerTypes.id],
  }),
}));

export const customerTypeRelations = relations(customerTypes, ({ many }) => ({
  customers: many(customers),
}));

export const purchaseInvoiceRelations = relations(purchaseInvoices, ({ many }) => ({
  items: many(purchaseInvoiceItems),
}));

export const purchaseInvoiceItemRelations = relations(purchaseInvoiceItems, ({ one }) => ({
  invoice: one(purchaseInvoices, {
    fields: [purchaseInvoiceItems.invoiceId],
    references: [purchaseInvoices.id],
  }),
  product: one(products, {
    fields: [purchaseInvoiceItems.productId],
    references: [products.id],
  }),
}));

export const salesInvoiceRelations = relations(salesInvoices, ({ many }) => ({
  items: many(salesInvoiceItems),
}));

export const salesInvoiceItemRelations = relations(salesInvoiceItems, ({ one }) => ({
  invoice: one(salesInvoices, {
    fields: [salesInvoiceItems.invoiceId],
    references: [salesInvoices.id],
  }),
  product: one(products, {
    fields: [salesInvoiceItems.productId],
    references: [products.id],
  }),
}));

export const stockRelations = relations(stock, ({ one }) => ({
  product: one(products, {
    fields: [stock.productId],
    references: [products.id],
  }),
}));

// Types pour TypeScript
export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type CustomerType = typeof customerTypes.$inferSelect;
export type NewCustomerType = typeof customerTypes.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type PurchaseInvoice = typeof purchaseInvoices.$inferSelect;
export type NewPurchaseInvoice = typeof purchaseInvoices.$inferInsert;
export type PurchaseInvoiceItem = typeof purchaseInvoiceItems.$inferSelect;
export type NewPurchaseInvoiceItem = typeof purchaseInvoiceItems.$inferInsert;
export type SalesInvoice = typeof salesInvoices.$inferSelect;
export type NewSalesInvoice = typeof salesInvoices.$inferInsert;
export type SalesInvoiceItem = typeof salesInvoiceItems.$inferSelect;
export type NewSalesInvoiceItem = typeof salesInvoiceItems.$inferInsert;
export type Stock = typeof stock.$inferSelect;
export type NewStock = typeof stock.$inferInsert;
export type StockMovement = typeof stockMovements.$inferSelect;
export type NewStockMovement = typeof stockMovements.$inferInsert;
export type Settings = typeof settings.$inferSelect;
export type NewSettings = typeof settings.$inferInsert;