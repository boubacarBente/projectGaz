import Database from "better-sqlite3";
import { db } from "@/db";

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
  { code: "B3", name: "Petite bouteille", capacity: "3 kg", unitPrice: 10000, salePrice: 12000 },
  { code: "B6", name: "Moyenne bouteille", capacity: "6 kg", unitPrice: 20000, salePrice: 22000 },
  { code: "B9", name: "Grande bouteille", capacity: "9 kg", unitPrice: 30000, salePrice: 32000 },
  { code: "B12", name: "Très grande bouteille", capacity: "12 kg", unitPrice: 40000, salePrice: 42000 },
  { code: "B36", name: "Bouteille industrielle", capacity: "36 kg", unitPrice: 50000, salePrice: 52000 },
  { code: "B48", name: "Grande bouteille industrielle", capacity: "48 kg", unitPrice: 60000, salePrice: 62000 },
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
  const client: Database.Database = (db as any).$client;

  const results: string[] = [];

  // ── Vérifier les données existantes ──
  const existingClients = client.prepare("SELECT COUNT(*) as count FROM customers").get() as { count: number };
  const existingSuppliers = client.prepare("SELECT COUNT(*) as count FROM suppliers").get() as { count: number };
  const existingProducts = client.prepare("SELECT COUNT(*) as count FROM products").get() as { count: number };
  const existingPurchaseInvoices = client.prepare("SELECT COUNT(*) as count FROM purchase_invoices").get() as { count: number };
  const existingSalesInvoices = client.prepare("SELECT COUNT(*) as count FROM sales_invoices").get() as { count: number };

  // ── Clients ──
  if (existingClients.count === 0) {
    let typeParticulier = 1;
    let typeProfessionnel = 2;
    const typeCount = client.prepare("SELECT COUNT(*) as count FROM customer_types").get() as { count: number };
    if (typeCount.count === 0) {
      client.prepare("INSERT INTO customer_types (name) VALUES ('Particulier')").run();
      client.prepare("INSERT INTO customer_types (name) VALUES ('Professionnel')").run();
      const types = client.prepare("SELECT id, name FROM customer_types ORDER BY id").all() as { id: number; name: string }[];
      for (const t of types) {
        if (t.name === 'Particulier') typeParticulier = t.id;
        if (t.name === 'Professionnel') typeProfessionnel = t.id;
      }
      results.push("✓ Types de clients créés (Particulier, Professionnel)");
    }

    const insertClient = client.prepare(
      "INSERT INTO customers (name, phone, address, city, type_id, is_active) VALUES (?, ?, ?, ?, ?, 1)"
    );
    for (const c of seedClients) {
      const typeId = c.typeId === 2 ? typeProfessionnel : typeParticulier;
      insertClient.run(c.name, c.phone, c.address, c.city, typeId);
    }
    results.push(`✓ ${seedClients.length} clients créés`);
  } else {
    results.push("→ Clients ignorés (déjà existants)");
  }

  // ── Fournisseurs ──
  if (existingSuppliers.count === 0) {
    const insertSupplier = client.prepare(
      "INSERT INTO suppliers (name, phone, address, is_active) VALUES (?, ?, ?, 1)"
    );
    for (const s of seedSuppliers) {
      insertSupplier.run(s.name, s.phone, s.address);
    }
    results.push(`✓ ${seedSuppliers.length} fournisseurs créés`);
  } else {
    results.push("→ Fournisseurs ignorés (déjà existants)");
  }

  // ── Produits et stock ──
  if (existingProducts.count === 0) {
    const insertProduct = client.prepare(
      "INSERT INTO products (code, name, capacity, unit_price, sale_price) VALUES (?, ?, ?, ?, ?)"
    );
    for (const p of seedProducts) {
      insertProduct.run(p.code, p.name, p.capacity, p.unitPrice, p.salePrice);
    }
    results.push(`✓ ${seedProducts.length} produits créés`);

    const products = client.prepare("SELECT id, code, name, capacity FROM products").all() as { id: number; code: string; name: string; capacity: string }[];
    const insertStock = client.prepare(
      "INSERT INTO stock (product_id, product_code, product_name, capacity, current_stock, min_stock) VALUES (?, ?, ?, ?, ?, ?)"
    );
    for (const prod of products) {
      insertStock.run(prod.id, prod.code, prod.name, prod.capacity, 200, 10);
    }
    results.push(`✓ Stock initialisé (200 unités par produit, seuil min : 10)`);
  } else {
    results.push("→ Produits ignorés (déjà existants)");
  }

  // ── Factures d'achat (20) ──
  if (existingPurchaseInvoices.count === 0) {
    const suppliers = client.prepare("SELECT id, name FROM suppliers").all() as { id: number; name: string }[];
    const products = client.prepare("SELECT id, code, name FROM products").all() as { id: number; code: string; name: string }[];

    const insertInvoice = client.prepare(
      `INSERT INTO purchase_invoices (reference, supplier_id, date, notes, total_amount, is_paid, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const insertItem = client.prepare(
      `INSERT INTO purchase_invoice_items (invoice_id, product_id, product_code, product_name, quantity, unit_cost, total_cost)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    const insertMovement = client.prepare(
      `INSERT INTO stock_movements (product_id, product_code, product_name, type, quantity, reference, notes, created_at)
       VALUES (?, ?, ?, 'entry', ?, ?, ?, ?)`
    );
    const updateStock = client.prepare(
      `UPDATE stock SET current_stock = current_stock + ?, last_entry = ? WHERE product_id = ?`
    );
    const updateSupplierTotal = client.prepare(
      `UPDATE suppliers SET total_purchases = COALESCE(total_purchases, 0) + ? WHERE id = ?`
    );

    const invoicesCount = purchaseInvoiceSeeds.length;

    client.transaction(() => {
      for (let i = 0; i < purchaseInvoiceSeeds.length; i++) {
        const seed = purchaseInvoiceSeeds[i];
        const supplier = suppliers.find(s => s.id === seed.supplierId)!;
        const ref = `ACH ${String(i + 1).padStart(4, '0')}`;
        const dateObj = new Date(seed.date + 'T08:00:00');
        const ts = dateObj.getTime();

        // Calculer le total
        let totalAmount = 0;
        const itemRows: { productId: number; code: string; name: string; qty: number; cost: number; total: number }[] = [];
        for (const line of seed.lines) {
          const prod = products.find(p => p.id === line.productId)!;
          const total = line.quantity * line.unitCost;
          totalAmount += total;
          itemRows.push({ productId: prod.id, code: prod.code, name: prod.name, qty: line.quantity, cost: line.unitCost, total });
        }

        insertInvoice.run(ref, seed.supplierId, seed.date, '', totalAmount, seed.isPaid ? 1 : 0, ts, ts);

        const invoiceId = i + 1; // autoincrement séquentiel dans la transaction

        for (const item of itemRows) {
          insertItem.run(invoiceId, item.productId, item.code, item.name, item.qty, item.cost, item.total);
          insertMovement.run(item.productId, item.code, item.name, item.qty, `ACHAT-${ref}`, `Approvisionnement via facture ${ref}`, ts);
          updateStock.run(item.qty, seed.date, item.productId);
        }

        updateSupplierTotal.run(totalAmount, seed.supplierId);
      }
    })();

    results.push(`✓ ${invoicesCount} factures d'achat créées`);
    results.push(`✓ Mouvements de stock et totaux fournisseurs mis à jour`);
  } else {
    results.push("→ Factures d'achat ignorées (déjà existantes)");
  }

  // ── Factures de vente (50) ──
  if (existingSalesInvoices.count === 0) {
    const products = client.prepare("SELECT id, code, name FROM products").all() as { id: number; code: string; name: string }[];
    const customers = client.prepare("SELECT id, name FROM customers").all() as { id: number; name: string }[];

    const insertInvoice = client.prepare(
      `INSERT INTO sales_invoices (invoice_number, customer_id, customer_name, date, payment_method, notes, total_amount, amount_paid, remaining_amount, payment_status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const insertItem = client.prepare(
      `INSERT INTO sales_invoice_items (invoice_id, product_id, product_code, product_name, quantity, unit_price, total_price)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    const insertMovement = client.prepare(
      `INSERT INTO stock_movements (product_id, product_code, product_name, type, quantity, reference, notes, created_at)
       VALUES (?, ?, ?, 'exit', ?, ?, ?, ?)`
    );
    const updateStock = client.prepare(
      `UPDATE stock SET current_stock = MAX(0, current_stock - ?), last_exit = ? WHERE product_id = ?`
    );
    const updateCustomerTotal = client.prepare(
      `UPDATE customers SET total_purchases = COALESCE(total_purchases, 0) + ? WHERE name = ?`
    );

    const totalSales = saleInvoiceSeeds.length;

    client.transaction(() => {
      for (let i = 0; i < saleInvoiceSeeds.length; i++) {
        const seed = saleInvoiceSeeds[i];
        const customer = customers.find(c => c.name === seed.customerName)!;
        const invoiceNum = `N ${String(i + 1).padStart(6, '0')}`;
        const dateObj = new Date(seed.date + 'T10:00:00');
        const ts = dateObj.getTime();

        // Calculer le total
        let totalAmount = 0;
        const itemRows: { productId: number; code: string; name: string; qty: number; price: number; total: number }[] = [];
        for (const line of seed.lines) {
          const prod = products.find(p => p.id === line.productId)!;
          const total = line.quantity * line.unitPrice;
          totalAmount += total;
          itemRows.push({ productId: prod.id, code: prod.code, name: prod.name, qty: line.quantity, price: line.unitPrice, total });
        }

        const remainingAmount = Math.max(totalAmount - seed.amountPaid, 0);
        const paymentStatus = seed.amountPaid <= 0 ? 'En attente' : remainingAmount > 0 ? 'Partiel' : 'Paye';

        insertInvoice.run(invoiceNum, customer?.id ?? null, seed.customerName, seed.date, seed.paymentMethod, '', totalAmount, seed.amountPaid, remainingAmount, paymentStatus, ts, ts);

        const invoiceId = i + 1; // autoincrement séquentiel dans la transaction

        for (const item of itemRows) {
          insertItem.run(invoiceId, item.productId, item.code, item.name, item.qty, item.price, item.total);
          insertMovement.run(item.productId, item.code, item.name, item.qty, `FACT-${invoiceNum}`, `Vente via facture ${invoiceNum}`, ts);
          updateStock.run(item.qty, seed.date, item.productId);
        }

        updateCustomerTotal.run(totalAmount, seed.customerName);
      }
    })();

    results.push(`✓ ${totalSales} factures de vente créées`);
    results.push(`✓ Mouvements de stock et totaux clients mis à jour`);
  } else {
    results.push("→ Factures de vente ignorées (déjà existantes)");
  }

  return {
    success: true,
    message: results.join("\n"),
  };
}
