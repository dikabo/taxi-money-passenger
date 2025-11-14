'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { passengerOtpSchema } from '@/lib/validations/passenger-auth';
import {
  Form,
  FormControl,
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
import { Button } from '@/components/ui/button';
import { toast as sonnerToast } from 'sonner';
import { Loader2 } from 'lucide-react';

/**
 * File: /components/forms/PassengerOtpForm.tsx
 * Purpose: OTP verification form for the passenger (French UI, English comments).
 */

// We only need the 'token' part of the schema
const formSchema = z.object({
  token: z
    .string()
    .min(6, 'Le code OTP doit être de 6 chiffres')
    .max(6, 'Le code OTP doit être de 6 chiffres'),
});

type OtpFormValues = z.infer<typeof formSchema>;

export function PassengerOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const phoneNumber = searchParams.get('phone'); 

  const form = useForm<OtpFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      token: '',
    },
  });

  const onSubmit: SubmitHandler<OtpFormValues> = async (values) => {
    setIsLoading(true);

    if (!phoneNumber) {
      // UI Error: French
      sonnerToast.error('Erreur', {
        description: 'Numéro de téléphone introuvable. Veuillez vous réinscrire.',
      });
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          token: values.token,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Échec de la vérification OTP');
      }

      // UI Success: French
      sonnerToast.success('Téléphone vérifié!', {
        description: 'Votre compte est actif. Redirection...',
      });

      router.push('/home');
    } catch (error) {
      let errorMessage = 'Une erreur inattendue est survenue.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      // UI Error: French
      sonnerToast.error('Échec de la vérification', {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="token"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sr-only">Code à usage unique</FormLabel>
              <FormControl>
                <InputOTP
                  maxLength={6}
                  {...field}
                  containerClassName="justify-center"
                >
                  <InputOTPGroup className="text-white">
                    <InputOTPSlot index={0} className="bg-gray-900 border-gray-800" />
                    <InputOTPSlot index={1} className="bg-gray-900 border-gray-800" />
                    <InputOTPSlot index={2} className="bg-gray-900 border-gray-800" />
                    <InputOTPSlot index={3} className="bg-gray-900 border-gray-800" />
                    <InputOTPSlot index={4} className="bg-gray-900 border-gray-800" />
                    <InputOTPSlot index={5} className="bg-gray-900 border-gray-800" />
                  </InputOTPGroup>
                </InputOTP>
              </FormControl>
              <FormMessage className="text-center" />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            'Vérifier le compte'
          )}
        </Button>
      </form>
      <p className="text-center text-sm text-gray-400 mt-6">
        Vous n&apos;avez pas reçu de code?{' '}
        <Button variant="link" className="p-0 text-white">
          Renvoyer le code
        </Button>
      </p>
    </Form>
  );
}