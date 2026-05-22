import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const cookieStore = await cookies();
  const sessionUser = cookieStore.get('session_user');

  if (!sessionUser?.value) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  try {
    const user = JSON.parse(sessionUser.value);
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
