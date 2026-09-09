'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { DataStore } from './store';
import { signJwt, verifyJwt, hashPassword, COOKIE_NAME, JwtPayload } from './jwt';
import { UserRole } from '@/types/database';

export async function loginWithUsernameAction(formData: FormData) {
  const username = formData.get('username')?.toString().trim();
  const password = formData.get('password')?.toString();

  if (!username || !password) {
    throw new Error('Please enter both username and password.');
  }

  const user = DataStore.verifyUserCredentials(username, password);
  if (!user) {
    // Section 1.1: generic error, never reveal if username or password was the wrong one
    throw new Error('Invalid username or password.');
  }

  // Generate JWT token
  const token = signJwt({
    userId: user.id,
    username: user.username,
    role: user.role,
    fullName: user.full_name,
  });

  // Store in secure httpOnly cookie
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 86400, // 7 days
  });

  DataStore.setSessionRole(user.role);

  return { success: true, role: user.role, username: user.username };
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  redirect('/login');
}

export async function getCurrentUser(): Promise<JwtPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  return verifyJwt(token);
}
