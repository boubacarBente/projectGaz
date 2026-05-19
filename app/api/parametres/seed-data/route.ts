import { seedDatabase } from '@/lib/seed-data';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const result = await seedDatabase();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error seeding database:', error);
    return NextResponse.json(
      { error: 'Erreur lors du préremplissage des données' },
      { status: 500 }
    );
  }
}
