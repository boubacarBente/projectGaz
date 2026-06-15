import { NextRequest, NextResponse } from 'next/server';
import { adjustStock } from '@/lib/stock';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, newStock, note } = body;

    if (!productId || newStock === undefined || newStock < 0) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
    }

    const result = await adjustStock(productId, newStock, note || 'Ajustement manuel');
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Error adjusting stock:', error);
    return NextResponse.json({ error: "Erreur lors de l'ajustement" }, { status: 500 });
  }
}
