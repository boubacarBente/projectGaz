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

export async function seedDatabase() {
  const client: Database.Database = (db as any).$client;

  // Vérifier s'il y a déjà des données
  const existingClients = client.prepare("SELECT COUNT(*) as count FROM customers").get() as { count: number };
  const existingSuppliers = client.prepare("SELECT COUNT(*) as count FROM suppliers").get() as { count: number };

  const results: string[] = [];

  // Seed clients
  if (existingClients.count === 0) {
    // Créer un type de client par défaut si nécessaire
    const typeCount = client.prepare("SELECT COUNT(*) as count FROM customer_types").get() as { count: number };
    if (typeCount.count === 0) {
      client.prepare("INSERT INTO customer_types (name) VALUES ('Particulier')").run();
      client.prepare("INSERT INTO customer_types (name) VALUES ('Professionnel')").run();
      results.push("✓ Types de clients créés (Particulier, Professionnel)");
    }

    const insertClient = client.prepare(
      "INSERT INTO customers (name, phone, address, city, type_id, is_active) VALUES (?, ?, ?, ?, ?, 1)"
    );
    for (const c of seedClients) {
      insertClient.run(c.name, c.phone, c.address, c.city, c.typeId ?? 1);
    }
    results.push(`✓ ${seedClients.length} clients créés`);
  } else {
    results.push("→ Clients ignorés (déjà existants)");
  }

  // Seed suppliers
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

  return {
    success: true,
    message: results.join("\n"),
  };
}
