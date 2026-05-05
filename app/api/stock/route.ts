import { initializeStock, getStock, updateProductMinStock, addStockMovement, getStockMovements, getLowStockAlerts } from '@/lib/operations';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    
    // Initialize stock if needed
    await initializeStock();
    
    if (type === 'movements') {
      const limit = parseInt(searchParams.get('limit') || '50', 10);
      const movements = await getStockMovements(limit);
      return NextResponse.json(movements);
    }
    
    if (type === 'alerts') {
      const alerts = await getLowStockAlerts();
      return NextResponse.json(alerts);
    }
    
    // Default: return stock
    const stock = await getStock();
    return NextResponse.json(stock);
  } catch (error) {
    console.error('Error fetching stock:', error);
    return NextResponse.json({ error: 'Failed to fetch stock' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productId, type, quantity, reference, notes } = body;

    if (!productId || !type || !quantity || !reference) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await addStockMovement({
      productId: parseInt(productId),
      type,
      quantity: parseInt(quantity),
      reference,
      notes,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error adding stock movement:', error);
    return NextResponse.json({ error: 'Failed to add stock movement' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { productId, minStock } = body;

    if (!productId || minStock === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await updateProductMinStock(parseInt(productId), parseInt(minStock));
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating stock:', error);
    return NextResponse.json({ error: 'Failed to update stock' }, { status: 500 });
  }
}