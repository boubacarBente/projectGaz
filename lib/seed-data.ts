import { rawAll, rawGet, rawRun, withRawTransaction } from "@/db";

const WALLET_SEED_TARGET = 1_200;
const WALLET_SEED_BATCH_SIZE = 125;

type WalletSeedRow = {
  amount: number;
  type: 'income' | 'expense';
  description: string;
  createdAt: number;
};

function randomDateBetween(start: Date, end: Date): string {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return d.toISOString().slice(0, 10);
}

function buildWalletSeedRows(count: number): WalletSeedRow[] {
  const now = new Date();
  const start = new Date(now.getFullYear() - 1, 0, 1, 8, 0, 0);
  const startTimestamp = Math.floor(start.getTime() / 1000);
  const endTimestamp = Math.floor(now.getTime() / 1000);
  const interval = Math.max(1, Math.floor((endTimestamp - startTimestamp) / (count + 1)));
  const incomeDescriptions = [
    '[Démo] Vente comptant',
    '[Démo] Règlement client',
    '[Démo] Encaissement livraison',
    '[Démo] Paiement Mobile Money',
  ];
  const expenseDescriptions = [
    '[Démo] Achat de gaz',
    '[Démo] Transport et livraison',
    '[Démo] Charge d’exploitation',
    '[Démo] Paiement fournisseur',
  ];

  return Array.from({ length: count }, (_, index) => {
    const type: WalletSeedRow['type'] = index % 5 === 1 || index % 5 === 4
      ? 'expense'
      : 'income';
    const descriptions = type === 'income' ? incomeDescriptions : expenseDescriptions;
    const amount = type === 'income'
      ? 100_000 + ((index * 37) % 40) * 25_000
      : 50_000 + ((index * 29) % 24) * 25_000;

    return {
      amount,
      type,
      description: descriptions[index % descriptions.length],
      createdAt: Math.min(endTimestamp, startTimestamp + interval * (index + 1)),
    };
  });
}

export const seedClients = [
  { name: "Mamadou Diallo", phone: "+224 621 111 111", address: "Conakry, Ratoma", city: "Conakry", typeId: 1 },
  { name: "Fatoumata Bah", phone: "+224 622 222 222", address: "Conakry, Dixinn", city: "Conakry", typeId: 1 },
  { name: "Alpha Condé", phone: "+224 623 333 333", address: "Conakry, Matam", city: "Conakry", typeId: 2 },
  { name: "Aissatou Sow", phone: "+224 624 444 444", address: "Conakry, Kaloum", city: "Conakry", typeId: 1 },
  { name: "Ibrahima Sylla", phone: "+224 625 555 555", address: "Kindia, Centre", city: "Kindia", typeId: 2 },
];

export const seedSuppliers = [
  { name: "Gaz Afrique SA", phone: "+224 626 111 111", address: "Conakry, Kipé" },
  { name: "TotalEnergies Guinée", phone: "+224 627 222 222", address: "Conakry, Kaloum" },
  { name: "Guinée Gaz Sarl", phone: "+224 628 333 333", address: "Conakry, Matoto" },
  { name: "Toutaz Guinée", phone: "+224 629 444 444", address: "Conakry, Tombolia" },
  { name: "PetroGaz Guinée", phone: "+224 630 555 555", address: "Conakry, Gbessia" },
];

export const seedProducts = [
  { code: "B3", name: "Petite bouteille", capacity: "3 kg", unitPrice: 10000, salePrice: 12000, stock: 150, stockMin: 20 },
  { code: "B6", name: "Moyenne bouteille", capacity: "6 kg", unitPrice: 20000, salePrice: 22000, stock: 100, stockMin: 15 },
  { code: "B9", name: "Grande bouteille", capacity: "9 kg", unitPrice: 30000, salePrice: 32000, stock: 80, stockMin: 10 },
  { code: "B12", name: "Très grande bouteille", capacity: "12 kg", unitPrice: 40000, salePrice: 42000, stock: 60, stockMin: 10 },
  { code: "B36", name: "Bouteille industrielle", capacity: "36 kg", unitPrice: 50000, salePrice: 52000, stock: 40, stockMin: 5 },
  { code: "B48", name: "Grande bouteille industrielle", capacity: "48 kg", unitPrice: 60000, salePrice: 62000, stock: 20, stockMin: 3 },
];

// Données de factures d'achat (usine) et de ventes
const purchaseInvoiceSeeds: {
  supplierId: number;
  date: string;
  isPaid: boolean;
  lines: { productId: number; quantity: number; unitCost: number }[];
}[] = [
  // Janvier 2026 – 3 factures
  { supplierId: 1, date: "2026-01-05", isPaid: true, lines: [{ productId: 1, quantity: 30, unitCost: 10000 }, { productId: 2, quantity: 20, unitCost: 20000 }] },
  { supplierId: 2, date: "2026-01-12", isPaid: true, lines: [{ productId: 3, quantity: 25, unitCost: 30000 }, { productId: 4, quantity: 15, unitCost: 40000 }] },
  { supplierId: 3, date: "2026-01-22", isPaid: true, lines: [{ productId: 5, quantity: 10, unitCost: 50000 }, { productId: 6, quantity: 8, unitCost: 60000 }] },
  // Février 2026 – 3 factures
  { supplierId: 1, date: "2026-02-03", isPaid: true, lines: [{ productId: 1, quantity: 40, unitCost: 10000 }, { productId: 2, quantity: 30, unitCost: 20000 }] },
  { supplierId: 4, date: "2026-02-14", isPaid: true, lines: [{ productId: 3, quantity: 20, unitCost: 30000 }, { productId: 5, quantity: 12, unitCost: 50000 }] },
  { supplierId: 5, date: "2026-02-25", isPaid: true, lines: [{ productId: 4, quantity: 18, unitCost: 40000 }, { productId: 6, quantity: 10, unitCost: 60000 }] },
  // Mars 2026 – 3 factures
  { supplierId: 2, date: "2026-03-08", isPaid: true, lines: [{ productId: 1, quantity: 50, unitCost: 10000 }, { productId: 2, quantity: 25, unitCost: 20000 }, { productId: 3, quantity: 15, unitCost: 30000 }] },
  { supplierId: 3, date: "2026-03-16", isPaid: false, lines: [{ productId: 5, quantity: 15, unitCost: 50000 }, { productId: 6, quantity: 12, unitCost: 60000 }] },
  { supplierId: 1, date: "2026-03-28", isPaid: true, lines: [{ productId: 4, quantity: 22, unitCost: 40000 }] },
  // Avril 2026 – 3 factures
  { supplierId: 4, date: "2026-04-05", isPaid: true, lines: [{ productId: 1, quantity: 35, unitCost: 10000 }, { productId: 3, quantity: 20, unitCost: 30000 }] },
  { supplierId: 5, date: "2026-04-15", isPaid: false, lines: [{ productId: 2, quantity: 40, unitCost: 20000 }, { productId: 4, quantity: 15, unitCost: 40000 }] },
  { supplierId: 2, date: "2026-04-26", isPaid: true, lines: [{ productId: 5, quantity: 8, unitCost: 50000 }, { productId: 6, quantity: 6, unitCost: 60000 }] },
  // Mai 2026 – 4 factures (dont 2 encore impayées)
  { supplierId: 3, date: "2026-05-04", isPaid: true, lines: [{ productId: 1, quantity: 60, unitCost: 10000 }, { productId: 2, quantity: 35, unitCost: 20000 }] },
  { supplierId: 1, date: "2026-05-12", isPaid: false, lines: [{ productId: 3, quantity: 30, unitCost: 30000 }, { productId: 4, quantity: 20, unitCost: 40000 }] },
  { supplierId: 4, date: "2026-05-19", isPaid: true, lines: [{ productId: 5, quantity: 10, unitCost: 50000 }, { productId: 6, quantity: 8, unitCost: 60000 }] },
  { supplierId: 5, date: "2026-05-28", isPaid: false, lines: [{ productId: 1, quantity: 25, unitCost: 10000 }, { productId: 3, quantity: 18, unitCost: 30000 }] },
  // Juin 2026 – 4 factures
  { supplierId: 2, date: "2026-06-02", isPaid: true, lines: [{ productId: 2, quantity: 30, unitCost: 20000 }, { productId: 4, quantity: 25, unitCost: 40000 }] },
  { supplierId: 3, date: "2026-06-10", isPaid: true, lines: [{ productId: 5, quantity: 20, unitCost: 50000 }] },
  { supplierId: 1, date: "2026-06-18", isPaid: true, lines: [{ productId: 1, quantity: 45, unitCost: 10000 }, { productId: 6, quantity: 10, unitCost: 60000 }] },
  { supplierId: 4, date: "2026-06-25", isPaid: false, lines: [{ productId: 3, quantity: 22, unitCost: 30000 }, { productId: 5, quantity: 14, unitCost: 50000 }] },
];

const saleInvoiceSeeds: {
  customerName: string;
  date: string;
  paymentMethod: string;
  amountPaid: number;
  lines: { productId: number; quantity: number; unitPrice: number }[];
}[] = [
  // Janvier 2026 – 6 ventes
  { customerName: "Mamadou Diallo", date: "2026-01-06", paymentMethod: "Espèces", amountPaid: 12000, lines: [{ productId: 1, quantity: 1, unitPrice: 12000 }] },
  { customerName: "Fatoumata Bah", date: "2026-01-08", paymentMethod: "Mobile Money", amountPaid: 44000, lines: [{ productId: 2, quantity: 2, unitPrice: 22000 }] },
  { customerName: "Alpha Condé", date: "2026-01-10", paymentMethod: "Espèces", amountPaid: 96000, lines: [{ productId: 3, quantity: 3, unitPrice: 32000 }] },
  { customerName: "Aissatou Sow", date: "2026-01-15", paymentMethod: "Mobile Money", amountPaid: 42000, lines: [{ productId: 4, quantity: 1, unitPrice: 42000 }] },
  { customerName: "Ibrahima Sylla", date: "2026-01-20", paymentMethod: "Espèces", amountPaid: 52000, lines: [{ productId: 5, quantity: 1, unitPrice: 52000 }] },
  { customerName: "Mamadou Diallo", date: "2026-01-25", paymentMethod: "Mobile Money", amountPaid: 24000, lines: [{ productId: 1, quantity: 2, unitPrice: 12000 }] },
  // Février 2026 – 6 ventes
  { customerName: "Fatoumata Bah", date: "2026-02-02", paymentMethod: "Espèces", amountPaid: 22000, lines: [{ productId: 2, quantity: 1, unitPrice: 22000 }] },
  { customerName: "Alpha Condé", date: "2026-02-07", paymentMethod: "Mobile Money", amountPaid: 32000, lines: [{ productId: 3, quantity: 1, unitPrice: 32000 }] },
  { customerName: "Aissatou Sow", date: "2026-02-10", paymentMethod: "Espèces", amountPaid: 84000, lines: [{ productId: 4, quantity: 2, unitPrice: 42000 }] },
  { customerName: "Ibrahima Sylla", date: "2026-02-14", paymentMethod: "Mobile Money", amountPaid: 104000, lines: [{ productId: 5, quantity: 2, unitPrice: 52000 }] },
  { customerName: "Mamadou Diallo", date: "2026-02-18", paymentMethod: "Espèces", amountPaid: 12000, lines: [{ productId: 1, quantity: 1, unitPrice: 12000 }] },
  { customerName: "Fatoumata Bah", date: "2026-02-22", paymentMethod: "Espèces", amountPaid: 66000, lines: [{ productId: 2, quantity: 3, unitPrice: 22000 }] },
  // Mars 2026 – 8 ventes
  { customerName: "Alpha Condé", date: "2026-03-03", paymentMethod: "Mobile Money", amountPaid: 64000, lines: [{ productId: 3, quantity: 2, unitPrice: 32000 }] },
  { customerName: "Aissatou Sow", date: "2026-03-05", paymentMethod: "Espèces", amountPaid: 42000, lines: [{ productId: 4, quantity: 1, unitPrice: 42000 }] },
  { customerName: "Ibrahima Sylla", date: "2026-03-09", paymentMethod: "Mobile Money", amountPaid: 52000, lines: [{ productId: 5, quantity: 1, unitPrice: 52000 }] },
  { customerName: "Mamadou Diallo", date: "2026-03-12", paymentMethod: "Espèces", amountPaid: 36000, lines: [{ productId: 1, quantity: 3, unitPrice: 12000 }] },
  { customerName: "Fatoumata Bah", date: "2026-03-15", paymentMethod: "Mobile Money", amountPaid: 44000, lines: [{ productId: 2, quantity: 2, unitPrice: 22000 }] },
  { customerName: "Alpha Condé", date: "2026-03-19", paymentMethod: "Espèces", amountPaid: 124000, lines: [{ productId: 6, quantity: 2, unitPrice: 62000 }] },
  { customerName: "Aissatou Sow", date: "2026-03-24", paymentMethod: "Mobile Money", amountPaid: 84000, lines: [{ productId: 4, quantity: 2, unitPrice: 42000 }] },
  { customerName: "Ibrahima Sylla", date: "2026-03-29", paymentMethod: "Espèces", amountPaid: 52000, lines: [{ productId: 5, quantity: 1, unitPrice: 52000 }] },
  // Avril 2026 – 8 ventes
  { customerName: "Mamadou Diallo", date: "2026-04-02", paymentMethod: "Mobile Money", amountPaid: 24000, lines: [{ productId: 1, quantity: 2, unitPrice: 12000 }] },
  { customerName: "Fatoumata Bah", date: "2026-04-06", paymentMethod: "Espèces", amountPaid: 44000, lines: [{ productId: 2, quantity: 2, unitPrice: 22000 }] },
  { customerName: "Alpha Condé", date: "2026-04-09", paymentMethod: "Mobile Money", amountPaid: 96000, lines: [{ productId: 3, quantity: 3, unitPrice: 32000 }] },
  { customerName: "Aissatou Sow", date: "2026-04-13", paymentMethod: "Espèces", amountPaid: 42000, lines: [{ productId: 4, quantity: 1, unitPrice: 42000 }] },
  { customerName: "Ibrahima Sylla", date: "2026-04-17", paymentMethod: "Mobile Money", amountPaid: 156000, lines: [{ productId: 5, quantity: 3, unitPrice: 52000 }] },
  { customerName: "Mamadou Diallo", date: "2026-04-20", paymentMethod: "Espèces", amountPaid: 60000, lines: [{ productId: 1, quantity: 5, unitPrice: 12000 }] },
  { customerName: "Fatoumata Bah", date: "2026-04-23", paymentMethod: "Mobile Money", amountPaid: 22000, lines: [{ productId: 2, quantity: 1, unitPrice: 22000 }] },
  { customerName: "Alpha Condé", date: "2026-04-28", paymentMethod: "Espèces", amountPaid: 62000, lines: [{ productId: 6, quantity: 1, unitPrice: 62000 }] },
  // Mai 2026 – 10 ventes
  { customerName: "Aissatou Sow", date: "2026-05-02", paymentMethod: "Mobile Money", amountPaid: 84000, lines: [{ productId: 4, quantity: 2, unitPrice: 42000 }] },
  { customerName: "Ibrahima Sylla", date: "2026-05-05", paymentMethod: "Espèces", amountPaid: 52000, lines: [{ productId: 5, quantity: 1, unitPrice: 52000 }] },
  { customerName: "Mamadou Diallo", date: "2026-05-08", paymentMethod: "Mobile Money", amountPaid: 12000, lines: [{ productId: 1, quantity: 1, unitPrice: 12000 }] },
  { customerName: "Fatoumata Bah", date: "2026-05-10", paymentMethod: "Espèces", amountPaid: 66000, lines: [{ productId: 2, quantity: 3, unitPrice: 22000 }] },
  { customerName: "Alpha Condé", date: "2026-05-13", paymentMethod: "Mobile Money", amountPaid: 64000, lines: [{ productId: 3, quantity: 2, unitPrice: 32000 }] },
  { customerName: "Aissatou Sow", date: "2026-05-16", paymentMethod: "Espèces", amountPaid: 60000, lines: [{ productId: 1, quantity: 3, unitPrice: 12000 }, { productId: 4, quantity: 1, unitPrice: 24000 }] },
  { customerName: "Ibrahima Sylla", date: "2026-05-19", paymentMethod: "Mobile Money", amountPaid: 104000, lines: [{ productId: 5, quantity: 2, unitPrice: 52000 }] },
  { customerName: "Mamadou Diallo", date: "2026-05-22", paymentMethod: "Espèces", amountPaid: 36000, lines: [{ productId: 1, quantity: 3, unitPrice: 12000 }] },
  { customerName: "Fatoumata Bah", date: "2026-05-25", paymentMethod: "Mobile Money", amountPaid: 22000, lines: [{ productId: 2, quantity: 1, unitPrice: 22000 }] },
  { customerName: "Alpha Condé", date: "2026-05-29", paymentMethod: "Espèces", amountPaid: 32000, lines: [{ productId: 3, quantity: 1, unitPrice: 32000 }] },
  // Juin 2026 – 12 ventes (dont certaines partielles / en attente)
  { customerName: "Mamadou Diallo", date: "2026-06-01", paymentMethod: "Mobile Money", amountPaid: 12000, lines: [{ productId: 1, quantity: 1, unitPrice: 12000 }] },
  { customerName: "Fatoumata Bah", date: "2026-06-03", paymentMethod: "Espèces", amountPaid: 22000, lines: [{ productId: 2, quantity: 1, unitPrice: 22000 }] },
  { customerName: "Alpha Condé", date: "2026-06-05", paymentMethod: "Mobile Money", amountPaid: 0, lines: [{ productId: 3, quantity: 2, unitPrice: 32000 }] },
  { customerName: "Aissatou Sow", date: "2026-06-07", paymentMethod: "Espèces", amountPaid: 20000, lines: [{ productId: 4, quantity: 1, unitPrice: 42000 }] },
  { customerName: "Ibrahima Sylla", date: "2026-06-09", paymentMethod: "Mobile Money", amountPaid: 52000, lines: [{ productId: 5, quantity: 1, unitPrice: 52000 }] },
  { customerName: "Mamadou Diallo", date: "2026-06-11", paymentMethod: "Espèces", amountPaid: 12000, lines: [{ productId: 1, quantity: 1, unitPrice: 12000 }] },
  { customerName: "Fatoumata Bah", date: "2026-06-13", paymentMethod: "Mobile Money", amountPaid: 44000, lines: [{ productId: 2, quantity: 2, unitPrice: 22000 }] },
  { customerName: "Alpha Condé", date: "2026-06-15", paymentMethod: "Espèces", amountPaid: 30000, lines: [{ productId: 3, quantity: 3, unitPrice: 32000 }] },
  { customerName: "Aissatou Sow", date: "2026-06-18", paymentMethod: "Mobile Money", amountPaid: 42000, lines: [{ productId: 4, quantity: 1, unitPrice: 42000 }] },
  { customerName: "Ibrahima Sylla", date: "2026-06-20", paymentMethod: "Espèces", amountPaid: 100000, lines: [{ productId: 5, quantity: 2, unitPrice: 52000 }] },
  { customerName: "Mamadou Diallo", date: "2026-06-22", paymentMethod: "Mobile Money", amountPaid: 0, lines: [{ productId: 6, quantity: 1, unitPrice: 62000 }] },
  { customerName: "Fatoumata Bah", date: "2026-06-25", paymentMethod: "Espèces", amountPaid: 66000, lines: [{ productId: 2, quantity: 3, unitPrice: 22000 }] },
];

export async function seedDatabase() {
  const results: string[] = [];

  // ── Vérifier les données existantes ──
  const [
    existingClients,
    existingSuppliers,
    existingProducts,
    existingPurchaseInvoices,
    existingSalesInvoices,
    existingWalletTransactions,
  ] = await Promise.all([
    rawGet<{ count: number }>("SELECT COUNT(*) as count FROM customers"),
    rawGet<{ count: number }>("SELECT COUNT(*) as count FROM suppliers"),
    rawGet<{ count: number }>("SELECT COUNT(*) as count FROM products"),
    rawGet<{ count: number }>("SELECT COUNT(*) as count FROM purchase_invoices"),
    rawGet<{ count: number }>("SELECT COUNT(*) as count FROM sales_invoices"),
    rawGet<{ count: number }>("SELECT COUNT(*) as count FROM wallet_transactions"),
  ]);

  // ── Clients ──
  if ((existingClients?.count ?? 0) === 0) {
    let typeParticulier = 1;
    let typeProfessionnel = 2;
    const typeCount = await rawGet<{ count: number }>("SELECT COUNT(*) as count FROM customer_types");
    if ((typeCount?.count ?? 0) === 0) {
      await rawRun("INSERT INTO customer_types (name) VALUES ('Particulier')");
      await rawRun("INSERT INTO customer_types (name) VALUES ('Professionnel')");
      const types = await rawAll<{ id: number; name: string }>("SELECT id, name FROM customer_types ORDER BY id");
      for (const t of types) {
        if (t.name === 'Particulier') typeParticulier = t.id;
        if (t.name === 'Professionnel') typeProfessionnel = t.id;
      }
      results.push("✓ Types de clients créés (Particulier, Professionnel)");
    }

    for (const c of seedClients) {
      const typeId = c.typeId === 2 ? typeProfessionnel : typeParticulier;
      await rawRun(
        "INSERT INTO customers (name, phone, address, city, type_id, is_active) VALUES (?, ?, ?, ?, ?, 1)",
        [c.name, c.phone, c.address, c.city, typeId],
      );
    }
    results.push(`✓ ${seedClients.length} clients créés`);
  } else {
    results.push("→ Clients ignorés (déjà existants)");
  }

  // ── Fournisseurs ──
  if ((existingSuppliers?.count ?? 0) === 0) {
    for (const s of seedSuppliers) {
      await rawRun(
        "INSERT INTO suppliers (name, phone, address, is_active) VALUES (?, ?, ?, 1)",
        [s.name, s.phone, s.address],
      );
    }
    results.push(`✓ ${seedSuppliers.length} fournisseurs créés`);
  } else {
    results.push("→ Fournisseurs ignorés (déjà existants)");
  }

  // ── Produits ──
  if ((existingProducts?.count ?? 0) === 0) {
    for (const p of seedProducts) {
      await rawRun(
        "INSERT INTO products (code, name, capacity, unit_price, sale_price, stock, stock_min) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [p.code, p.name, p.capacity, p.unitPrice, p.salePrice, p.stock, p.stockMin],
      );
    }
    results.push(`✓ ${seedProducts.length} produits créés avec stock initial`);
  } else {
    results.push("→ Produits ignorés (déjà existants)");
  }

  // ── Portefeuille (1 200 transactions de démonstration) ──
  const existingWalletCount = Number(existingWalletTransactions?.count ?? 0);
  const walletTransactionsToCreate = Math.max(0, WALLET_SEED_TARGET - existingWalletCount);

  if (walletTransactionsToCreate > 0) {
    const walletRows = buildWalletSeedRows(walletTransactionsToCreate);

    await withRawTransaction(async (client) => {
      for (let offset = 0; offset < walletRows.length; offset += WALLET_SEED_BATCH_SIZE) {
        const batch = walletRows.slice(offset, offset + WALLET_SEED_BATCH_SIZE);
        const placeholders = batch.map(() => '(?, ?, ?, 0, ?, ?)').join(', ');
        const args: Array<string | number> = [];

        for (const row of batch) {
          args.push(row.amount, row.type, row.description, row.createdAt, row.createdAt);
        }

        await rawRun(
          `INSERT INTO wallet_transactions (amount, type, description, balance_after, created_at, updated_at)
           VALUES ${placeholders}`,
          args,
          client,
        );
      }

      await rawRun(`
        WITH ledger AS (
          SELECT
            id,
            SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) OVER (
              ORDER BY created_at ASC, id ASC
              ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            ) AS recalculated_balance
          FROM wallet_transactions
        )
        UPDATE wallet_transactions
        SET balance_after = (
          SELECT recalculated_balance
          FROM ledger
          WHERE ledger.id = wallet_transactions.id
        )
      `, [], client);
    });

    results.push(`✓ ${walletTransactionsToCreate} transactions portefeuille ajoutées (${WALLET_SEED_TARGET} au total)`);
  } else {
    results.push(`→ Portefeuille ignoré (${existingWalletCount} transactions déjà présentes)`);
  }

  // ── Factures d'achat (20) ──
  if ((existingPurchaseInvoices?.count ?? 0) === 0) {
    const supplierRows = await rawAll<{ id: number; name: string }>("SELECT id, name FROM suppliers");
    const productRows = await rawAll<{ id: number; code: string; name: string }>("SELECT id, code, name FROM products");
    const startDate = new Date('2026-01-01');
    const endDate = new Date();
    const purchaseInvoices = purchaseInvoiceSeeds.map(inv => ({
      ...inv,
      date: randomDateBetween(startDate, endDate),
    }));
    const invoicesCount = purchaseInvoices.length;

    await withRawTransaction(async (client) => {
      for (let i = 0; i < purchaseInvoices.length; i++) {
        const seed = purchaseInvoices[i];
        const supplier = supplierRows.find(s => s.id === seed.supplierId)!;
        const ref = `ACH ${String(i + 1).padStart(4, '0')}`;
        const dateObj = new Date(seed.date + 'T08:00:00');
        const ts = dateObj.getTime();

        // Calculer le total
        let totalAmount = 0;
        const itemRows: { productId: number; code: string; name: string; qty: number; cost: number; total: number }[] = [];
        for (const line of seed.lines) {
          const prod = productRows.find(p => p.id === line.productId)!;
          const total = line.quantity * line.unitCost;
          totalAmount += total;
          itemRows.push({ productId: prod.id, code: prod.code, name: prod.name, qty: line.quantity, cost: line.unitCost, total });
        }

        const insertedInvoice = await rawRun(
          `INSERT INTO purchase_invoices (reference, supplier_id, date, notes, total_amount, is_paid, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [ref, seed.supplierId, seed.date, '', totalAmount, seed.isPaid ? 1 : 0, ts, ts],
          client,
        );
        const invoiceId = Number(insertedInvoice.lastInsertRowid);

        for (const item of itemRows) {
          await rawRun(
            `INSERT INTO purchase_invoice_items (invoice_id, product_id, product_code, product_name, quantity, unit_cost, total_cost)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [invoiceId, item.productId, item.code, item.name, item.qty, item.cost, item.total],
            client,
          );
          // Récupérer le stock actuel avant mise à jour
          const currentStock = await rawGet<{ stock: number }>("SELECT COALESCE(stock, 0) as stock FROM products WHERE id = ?", [item.productId], client);
          // Mettre à jour le stock du produit
          await rawRun(`UPDATE products SET stock = COALESCE(stock, 0) + ? WHERE id = ?`, [item.qty, item.productId], client);
          // Créer le mouvement de stock
          const stockBefore = currentStock?.stock ?? 0;
          const newStock = stockBefore + item.qty;
          await rawRun(
            `INSERT INTO stock_movements (product_id, product_code, product_name, type, quantity, stock_before, stock_after, reference, reference_type, reference_id, note, created_at)
             VALUES (?, ?, ?, 'entry', ?, ?, ?, ?, 'purchase', ?, ?, ?)`,
            [item.productId, item.code, item.name, item.qty, stockBefore, newStock, ref, invoiceId, ref, ts],
            client,
          );
        }

        await rawRun(`UPDATE suppliers SET total_purchases = COALESCE(total_purchases, 0) + ? WHERE id = ?`, [totalAmount, seed.supplierId], client);
      }
    });

    results.push(`✓ ${invoicesCount} factures d'achat créées`);
    results.push(`✓ Stocks et mouvements de stock mis à jour`);
    results.push(`✓ Totaux fournisseurs mis à jour`);
  } else {
    results.push("→ Factures d'achat ignorées (déjà existantes)");
  }

  // ── Factures de vente (50) ──
  if ((existingSalesInvoices?.count ?? 0) === 0) {
    const productRows = await rawAll<{ id: number; code: string; name: string }>("SELECT id, code, name FROM products");
    const customerRows = await rawAll<{ id: number; name: string }>("SELECT id, name FROM customers");
    const startDate = new Date('2026-01-01');
    const endDate = new Date();
    const saleInvoices = saleInvoiceSeeds.map(inv => ({
      ...inv,
      date: randomDateBetween(startDate, endDate),
    }));
    const totalSales = saleInvoices.length;

    await withRawTransaction(async (client) => {
      for (let i = 0; i < saleInvoices.length; i++) {
        const seed = saleInvoices[i];
        const customer = customerRows.find(c => c.name === seed.customerName)!;
        const invoiceNum = `N ${String(i + 1).padStart(6, '0')}`;
        const dateObj = new Date(seed.date + 'T10:00:00');
        const ts = dateObj.getTime();

        // Calculer le total
        let totalAmount = 0;
        const itemRows: { productId: number; code: string; name: string; qty: number; price: number; total: number }[] = [];
        for (const line of seed.lines) {
          const prod = productRows.find(p => p.id === line.productId)!;
          const total = line.quantity * line.unitPrice;
          totalAmount += total;
          itemRows.push({ productId: prod.id, code: prod.code, name: prod.name, qty: line.quantity, price: line.unitPrice, total });
        }

        const remainingAmount = Math.max(totalAmount - seed.amountPaid, 0);
        const paymentStatus = seed.amountPaid <= 0 ? 'En attente' : remainingAmount > 0 ? 'Partiel' : 'Payée';

        const insertedInvoice = await rawRun(
          `INSERT INTO sales_invoices (invoice_number, customer_id, customer_name, date, payment_method, notes, total_amount, amount_paid, remaining_amount, payment_status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [invoiceNum, customer?.id ?? null, seed.customerName, seed.date, seed.paymentMethod, '', totalAmount, seed.amountPaid, remainingAmount, paymentStatus, ts, ts],
          client,
        );
        const invoiceId = Number(insertedInvoice.lastInsertRowid);

        for (const item of itemRows) {
          await rawRun(
            `INSERT INTO sales_invoice_items (invoice_id, product_id, product_code, product_name, quantity, unit_price, total_price)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [invoiceId, item.productId, item.code, item.name, item.qty, item.price, item.total],
            client,
          );
          // Récupérer le stock actuel avant mise à jour
          const currentStock = await rawGet<{ stock: number }>("SELECT COALESCE(stock, 0) as stock FROM products WHERE id = ?", [item.productId], client);
          // Mettre à jour le stock du produit (sortie)
          await rawRun(`UPDATE products SET stock = COALESCE(stock, 0) - ? WHERE id = ?`, [item.qty, item.productId], client);
          // Créer le mouvement de stock
          const stockBefore = currentStock?.stock ?? 0;
          const newStock = Math.max(0, stockBefore - item.qty);
          await rawRun(
            `INSERT INTO stock_movements (product_id, product_code, product_name, type, quantity, stock_before, stock_after, reference, reference_type, reference_id, note, created_at)
             VALUES (?, ?, ?, 'exit', ?, ?, ?, ?, 'sale', ?, ?, ?)`,
            [item.productId, item.code, item.name, item.qty, stockBefore, newStock, invoiceNum, invoiceId, invoiceNum, ts],
            client,
          );
        }

        await rawRun(`UPDATE customers SET total_purchases = COALESCE(total_purchases, 0) + ? WHERE name = ?`, [totalAmount, seed.customerName], client);
      }
    });

    results.push(`✓ ${totalSales} factures de vente créées`);
    results.push(`✓ Stocks et mouvements de stock mis à jour`);
    results.push(`✓ Totaux clients mis à jour`);
  } else {
    results.push("→ Factures de vente ignorées (déjà existantes)");
  }

  return {
    success: true,
    message: results.join("\n"),
  };
}
