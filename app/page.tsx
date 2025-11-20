import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createCookieServerClient } from '@/lib/db/supabase-server';

/**
 * File: /app/page.tsx
 * Purpose: Server-side redirect based on auth status
 * 
 * This prevents the empty page flash by doing server-side redirect
 */

export default async function RootPage() {
  const cookieStore = await cookies();
  const supabase = createCookieServerClient(cookieStore);

  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    redirect('/home');
  } else {
    redirect('/login');
  }
}