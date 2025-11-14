import {
  createServerClient as createSupabaseServerClient,
  CookieOptions,
} from '@supabase/ssr';
import { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';

/**
 * Fichier: /lib/auth/supabase-server.ts
 * Objectif: C'est la version 100% correcte et corrigée (pattern cookie).
 */

// 1. CLIENT POUR GÉRER LES SESSIONS UTILISATEUR (COOKIES)
export function createCookieServerClient(
  cookieStore: ReadonlyRequestCookies
): ReturnType<typeof createSupabaseServerClient> {
  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // Utilise la clé ANON
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch { /* (Ignoré) */ }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch { /* (Ignoré) */ }
        },
      },
    }
  );
}

// 2. CLIENT POUR LES ACTIONS ADMIN (créer un utilisateur)
export function createAdminServerClient(
  cookieStore: ReadonlyRequestCookies
): ReturnType<typeof createSupabaseServerClient> {
  const supabase = createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!, // Utilise la clé SERVICE
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch { /* (Ignoré) */ }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch { /* (Ignoré) */ }
        },
      },
    }
  );
  return supabase;
}