'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

/**
 * File: /app/page.tsx
 * Purpose: Redirect to login or home based on auth status
 * 
 * FIXED: Checks if user is authenticated before redirecting
 * - If authenticated → goes to /home
 * - If not authenticated → goes to /auth/login
 */

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Create Supabase client for client-side
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Check if user is authenticated
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // User is authenticated - go to home
        router.push('/home');
      } else {
        // User is not authenticated - go to login
        router.push('/auth/login');
      }
    });
  }, [router]);

  return null;
}