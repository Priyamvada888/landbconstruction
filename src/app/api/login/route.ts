import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { DataStore } from '@/lib/store';
import { signJwt, COOKIE_NAME } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const username = (body.username || '').toString().trim();
    const password = (body.password || '').toString();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Please enter both username and password.' },
        { status: 400 }
      );
    }

    await DataStore.syncFromSupabase();
    const user = DataStore.verifyUserCredentials(username, password);
    if (!user) {
      // Generic error — never reveal whether username or password was wrong
      return NextResponse.json(
        { error: 'Invalid username or password.' },
        { status: 401 }
      );
    }

    // Sign JWT token
    const token = signJwt({
      userId: user.id,
      username: user.username,
      role: user.role,
      fullName: user.full_name,
    });

    // Set secure httpOnly cookie
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 86400, // 7 days
    });

    DataStore.setSessionRole(user.role);

    return NextResponse.json({
      success: true,
      username: user.username,
      role: user.role,
    });
  } catch (err) {
    console.error('[/api/login] error:', err);
    return NextResponse.json(
      { error: 'Server error. Please try again.' },
      { status: 500 }
    );
  }
}
