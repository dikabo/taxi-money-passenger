import { createCookieServerClient } from '@/lib/db/supabase-server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * File: /app/api/auth/logout/route.ts
 * Purpose: API endpoint to log the user out.
 */
export async function POST() {
  const cookieStore = await cookies();
  const supabase = createCookieServerClient(cookieStore);

  // Get session and sign out
  await supabase.auth.signOut();

  return NextResponse.json({ success: true, message: 'Logged out' });
}