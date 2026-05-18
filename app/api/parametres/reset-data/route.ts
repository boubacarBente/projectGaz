import { resetDatabaseExceptProductsAndCustomers } from '@/lib/operations';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const result = await resetDatabaseExceptProductsAndCustomers();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error resetting database:', error);
    return NextResponse.json({ error: 'Failed to reset database' }, { status: 500 });
  }
}
