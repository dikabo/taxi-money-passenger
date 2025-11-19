'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { pinLoginSchema } from '@/lib/validations/passenger-auth';
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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { toast as sonnerToast } from 'sonner';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * File: /app/(auth)/login/page.tsx
 * Purpose: PIN-based login page for existing passengers
 */

type LoginFormValues = z.infer<typeof pinLoginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(pinLoginSchema),
    defaultValues: {
      pin: '',
    },
  });

  const onSubmit: SubmitHandler<LoginFormValues> = async (values) => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Connexion échouée');
      }

      sonnerToast.success('Connexion réussie!', {
        description: 'Bienvenue!',
      });

      router.push('/home');
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
            Entrez votre code PIN à 4 chiffres
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="pin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code PIN</FormLabel>
                    <FormControl>
                      <InputOTP maxLength={4} {...field} containerClassName="justify-center">
                        <InputOTPGroup className="text-white">
                          <InputOTPSlot index={0} className="bg-gray-800 border-gray-700" />
                          <InputOTPSlot index={1} className="bg-gray-800 border-gray-700" />
                          <InputOTPSlot index={2} className="bg-gray-800 border-gray-700" />
                          <InputOTPSlot index={3} className="bg-gray-800 border-gray-700" />
                        </InputOTPGroup>
                      </InputOTP>
                    </FormControl>
                    <FormDescription>
                      Votre code PIN personnel
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connexion en cours...
                  </>
                ) : (
                  'Se Connecter'
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