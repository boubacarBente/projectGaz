'use server';

import { db, schema } from '@/db';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

// Types
export type Customer = typeof schema.customers.$inferSelect;
export type NewCustomer = typeof schema.customers.$inferInsert;
export type CustomerType = typeof schema.customerTypes.$inferSelect;

// Get all customers
export async function getCustomers(search?: string, typeId?: number): Promise<Customer[]> {
  let customers = await db.select().from(schema.customers);
  
  if (search) {
    const searchLower = search.toLowerCase();
    customers = customers.filter(c => 
      c.name.toLowerCase().includes(searchLower) ||
      (c.phone && c.phone.includes(search))
    );
  }
  
  if (typeId) {
    customers = customers.filter(c => c.typeId === typeId);
  }
  
  return customers;
}

// Get single customer by ID
export async function getCustomer(id: number): Promise<Customer | null> {
  const [customer] = await db.select()
    .from(schema.customers)
    .where(eq(schema.customers, { id }))
    .limit(1);
  
  return customer || null;
}

// Create new customer
export async function createCustomer(data: {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  typeId?: number;
  notes?: string;
}): Promise<Customer> {
  const [newCustomer] = await db.insert(schema.customers).values({
    name: data.name,
    phone: data.phone || null,
    email: data.email || null,
    address: data.address || null,
    city: data.city || null,
    typeId: data.typeId || null,
    notes: data.notes || null,
    totalPurchases: 0,
    isActive: true,
  }).returning();

  revalidatePath('/clients');
  return newCustomer;
}

// Update customer
export async function updateCustomer(id: number, data: {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  typeId?: number;
  notes?: string;
  isActive?: boolean;
}): Promise<Customer> {
  const [updated] = await db.update(schema.customers)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(schema.customers.id, id))
    .returning();

  if (!updated) {
    throw new Error('Client non trouvé');
  }

  revalidatePath('/clients');
  revalidatePath(`/clients/${id}`);
  return updated;
}

// Delete customer
export async function deleteCustomer(id: number): Promise<void> {
  await db.delete(schema.customers).where(eq(schema.customers.id, id));
  revalidatePath('/clients');
}

// Get all customer types
export async function getCustomerTypes(): Promise<CustomerType[]> {
  return db.select().from(schema.customerTypes);
}

// Add purchase amount to customer (for tracking total purchases)
export async function addPurchaseToCustomer(id: number, amount: number): Promise<void> {
  const [customer] = await db.select()
    .from(schema.customers)
    .where(eq(schema.customers.id, id))
    .limit(1);
  
  if (customer) {
    await db.update(schema.customers)
      .set({
        totalPurchases: (customer.totalPurchases || 0) + amount,
        updatedAt: new Date(),
      })
      .where(eq(schema.customers.id, id));
  }
}

// Get top customers by purchases
export async function getTopCustomers(limit: number = 10): Promise<Customer[]> {
  const customers = await db.select().from(schema.customers);
  return customers
    .sort((a, b) => (b.totalPurchases || 0) - (a.totalPurchases || 0))
    .slice(0, limit);
}