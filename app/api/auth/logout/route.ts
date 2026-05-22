import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set('session', '', { httpOnly: true, path: '/', maxAge: 0 });
  response.cookies.set('user', '', { httpOnly: false, path: '/', maxAge: 0 });
  response.cookies.set('session_user', '', { httpOnly: true, path: '/', maxAge: 0 });
  return response;
}
