import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwt, COOKIE_NAME } from '@/lib/jwt';

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json(null, { status: 401 });
  }

  const payload = verifyJwt(token);
  if (!payload) {
    return NextResponse.json(null, { status: 401 });
  }

  return NextResponse.json({
    userId: payload.userId,
    username: payload.username,
    fullName: payload.fullName,
    role: payload.role,
  });
}
