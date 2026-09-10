import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwt, COOKIE_NAME } from '@/lib/jwt';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { DataStore } from '@/lib/store';

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

  let freshProfile: { username?: string; full_name?: string | null; role?: string } | null = null;
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, full_name, role')
        .eq('id', payload.userId)
        .maybeSingle();
      if (data) {
        freshProfile = data;
      }
    } catch (err) {
      console.warn('Supabase fetch in /api/me error:', err);
    }
  }

  if (!freshProfile) {
    const memUser = DataStore.getProfiles().find(
      (p) => p.id === payload.userId || p.username.toLowerCase() === payload.username.toLowerCase()
    );
    if (memUser) {
      freshProfile = memUser;
    }
  }

  const username = freshProfile?.username || payload.username;
  const fullName = freshProfile?.full_name !== undefined ? freshProfile.full_name : payload.fullName;
  const role = freshProfile?.role || payload.role;

  return NextResponse.json({
    userId: payload.userId,
    username,
    fullName,
    role,
  });
}
