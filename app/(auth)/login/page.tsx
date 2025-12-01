'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { toast as sonnerToast } from 'sonner';
import { Loader2, Phone } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createBrowserClient } from '@supabase/ssr';

/**
 * File: /app/(auth)/login/page.tsx (PASSENGER APP)
 * Purpose: Phone-based login - SIMPLE like signup
 * ✅ FIXED: Properly formats phone to +237 for Supabase/Twilio
 * 
 * Flow:
 * 1. User enters phone (9 digits)
 * 2. Format to +237XXXXXXXXX for Supabase
 * 3. Check if user exists in MongoDB (6XXXXXXXX format)
 * 4. Supabase sends OTP to +237XXXXXXXXX
 * 5. Redirect to /verify-otp
 */

const cameroonPhoneRegex = /^[6-8]\d{8}$/;

const phoneLoginSchema = z.object({
  phoneNumber: z.string().regex(cameroonPhoneRegex, {
    message: 'Le numéro doit être composé de 9 chiffres (ex: 677123456)',
  }),
});

type LoginFormValues = z.infer<typeof phoneLoginSchema>;

/**
 * Format phone for Supabase (needs +237 prefix)
 */
function formatPhoneForSupabase(phone: string): string {
  // Remove all spaces and special characters
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // If already has +237, return as is
  if (cleaned.startsWith('+237')) {
    return cleaned;
  }
  
  // If starts with 237, add +
  if (cleaned.startsWith('237')) {
    return `+${cleaned}`;
  }
  
  // If starts with 6-8 (valid Cameroon mobile), add +237
  if (/^[6-8]\d{8}$/.test(cleaned)) {
    return `+237${cleaned}`;
  }
  
  // Otherwise add +237
  return `+237${cleaned}`;
}

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(phoneLoginSchema),
    defaultValues: {
      phoneNumber: '',
    },
  });

  const onSubmit: SubmitHandler<LoginFormValues> = async (values) => {
    setIsLoading(true);

    try {
      console.log('[LOGIN PAGE] Original phone:', values.phoneNumber);
      
      // ✅ CRITICAL: Format phone for Supabase/Twilio
      const supabasePhone = formatPhoneForSupabase(values.phoneNumber);
      console.log('[LOGIN PAGE] Formatted phone for Supabase:', supabasePhone);

      // 1. Create Supabase client
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // 2. Check if user exists in database first (using original format)
      const checkResponse = await fetch('/api/auth/check-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: values.phoneNumber }), // Send 9-digit format to API
      });

      if (!checkResponse.ok) {
        const error = await checkResponse.json();
        throw new Error(error.error || 'Ce numéro n\'est pas enregistré');
      }

      console.log('[LOGIN PAGE] ✅ User exists, sending OTP...');

      // 3. Send OTP via Supabase with +237 format
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: supabasePhone, // +237XXXXXXXXX for Twilio
        options: {
          shouldCreateUser: false, // Don't create new user, only login existing
        },
      });

      if (otpError) {
        console.error('[LOGIN PAGE] ❌ Supabase OTP error:', otpError);
        throw new Error('Impossible d\'envoyer l\'OTP. Veuillez réessayer.');
      }

      console.log('[LOGIN PAGE] ✅ OTP sent successfully');

      sonnerToast.success('OTP envoyé!', {
        description: 'Vérifiez votre téléphone pour le code.',
      });

      // 4. Redirect to OTP verification with formatted phone
      router.push(`/verify-otp?phone=${encodeURIComponent(supabasePhone)}`);
      
    } catch (error) {
      console.error('[LOGIN PAGE] ❌ Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Une erreur inattendue est survenue.';
      sonnerToast.error('Échec de la connexion', {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <Card className="w-full max-w-md bg-gray-900 border-gray-800 text-white">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl">Connexion</CardTitle>
          <CardDescription>
            Entrez votre numéro de téléphone
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numéro de téléphone</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <Input
                          {...field}
                          placeholder="677123456"
                          className="pl-10 bg-gray-800 border-gray-700 text-white"
                          type="tel"
                          maxLength={9}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      9 chiffres (ex: 677123456)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  'Continuer'
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-gray-400">
              Pas encore de compte?
            </p>
            <Link href="/signup">
              <Button variant="outline" className="w-full bg-gray-800 border-gray-700 hover:bg-gray-700">
                Créer un compte
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}