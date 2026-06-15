import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const dbPath = path.join(process.cwd(), 'db', 'database2.db');

    if (!fs.existsSync(dbPath)) {
      return NextResponse.json({ error: 'Base de données introuvable' }, { status: 404 });
    }

    const buffer = fs.readFileSync(dbPath);
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    const filename = `projectGaz-backup-${timestamp}.db`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Backup error:', error);
    return NextResponse.json({ error: 'Erreur lors de la création du backup' }, { status: 500 });
  }
}
