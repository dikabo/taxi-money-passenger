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

/**
 * File: /app/(auth)/login/page.tsx
 * Purpose: Phone number-based login page for existing passengers
 * ✅ FIXED: Changed from PIN to phone number + OTP verification
 * 
 * Flow:
 * 1. User enters phone number
 * 2. System sends OTP to phone
 * 3. User is redirected to /verify-otp page
 */

const cameroonPhoneRegex = /[6-8]\d{8}$/;

const phoneLoginSchema = z.object({
  phoneNumber: z.string().regex(cameroonPhoneRegex, {
    message: 'Le numéro doit être au format 6XXXXXXXX',
  }),
});

type LoginFormValues = z.infer<typeof phoneLoginSchema>;

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
      // Check if passenger exists with this phone number
      const checkResponse = await fetch('/api/auth/check-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: values.phoneNumber }),
      });

      const checkResult = await checkResponse.json();

      if (!checkResponse.ok) {
        throw new Error(checkResult.error || 'Numéro de téléphone non trouvé');
      }

      // Send OTP
      const otpResponse = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: values.phoneNumber }),
      });

      const otpResult = await otpResponse.json();

      if (!otpResponse.ok) {
        throw new Error(otpResult.error || 'Échec de l\'envoi de l\'OTP');
      }

      sonnerToast.success('OTP envoyé!', {
        description: 'Vérifiez votre téléphone pour le code.',
      });

      // Redirect to OTP verification page
      router.push(`/verify-otp?phone=${encodeURIComponent(values.phoneNumber)}&type=login`);
      
    } catch (error) {
      let errorMessage = 'Une erreur inattendue est survenue.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
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
            Entrez votre numéro de téléphone pour recevoir un code OTP
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
                          placeholder="600000000"
                          className="pl-10 bg-gray-800 border-gray-700 text-white"
                          type="tel"
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Le numéro utilisé lors de l&apos;inscription
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
                  'Recevoir le code OTP'
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