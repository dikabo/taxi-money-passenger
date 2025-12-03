'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { passengerSignupSchema } from '@/lib/validations/passenger-auth'; 
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { toast as sonnerToast } from 'sonner';
import { Loader2 } from 'lucide-react';

/**
 * File: /components/forms/PassengerSignupForm.tsx
 * Purpose: Passenger signup form (with French UI text).
 * ✅ FIXED: Redirects with +237 formatted phone for OTP verification
 */

type SignupFormValues = z.infer<typeof passengerSignupSchema>;

/**
 * Format phone for Supabase (needs +237 prefix)
 */
function formatPhoneForSupabase(phone: string): string {
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  if (cleaned.startsWith('+237')) {
    return cleaned;
  }
  
  if (cleaned.startsWith('237')) {
    return `+${cleaned}`;
  }
  
  if (/^[6-8]\d{8}$/.test(cleaned)) {
    return `+237${cleaned}`;
  }
  
  return `+237${cleaned}`;
}

export function PassengerSignupForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(passengerSignupSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phoneNumber: '',
      password: '',
      pin: '',
      email: '',
      termsAccepted: false,
      privacyAccepted: false,
    },
  });

  const onSubmit: SubmitHandler<SignupFormValues> = async (values) => {
    setIsLoading(true);
    let apiError = '';

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (!response.ok) {
        apiError = result.error || 'Une erreur inconnue est survenue';
      }

    } catch (error) {
      console.error('Fetch Error:', error);
      apiError = 'Impossible de contacter le serveur. Veuillez réessayer.';
    }

    if (apiError) {
      sonnerToast.error('Échec de l\'inscription', {
        description: apiError,
      });
      setIsLoading(false);
    } else {
      sonnerToast.success('Compte créé avec succès!', {
        description: 'Un code OTP a été envoyé à votre téléphone.',
      });
      
      setIsLoading(false);
      
      // ✅ FIX: Format phone to +237 before redirecting (must match OTP send format)
      const formattedPhone = formatPhoneForSupabase(values.phoneNumber);
      console.log('[SIGNUP FORM] Redirecting with phone:', formattedPhone);
      
      router.push(`/verify-otp?phone=${encodeURIComponent(formattedPhone)}`);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 text-white">
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prénom</FormLabel>
                <FormControl>
                  <Input placeholder="Valery" {...field} className="bg-gray-900 border-gray-800" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nom</FormLabel>
                <FormControl>
                  <Input placeholder="Tebid" {...field} className="bg-gray-900 border-gray-800" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Numéro de téléphone</FormLabel>
              <FormControl>
                <Input placeholder="677123456" {...field} className="bg-gray-900 border-gray-800" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mot de passe</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} className="bg-gray-900 border-gray-800" />
              </FormControl>
              <FormDescription>
                8+ caractères, avec lettre, chiffre et symbole.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="pin"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Code PIN de sécurité à 4 chiffres</FormLabel>
              <FormControl>
                <InputOTP maxLength={4} {...field} containerClassName="justify-center">
                  <InputOTPGroup className="text-white">
                    <InputOTPSlot index={0} className="bg-gray-900 border-gray-800" />
                    <InputOTPSlot index={1} className="bg-gray-900 border-gray-800" />
                    <InputOTPSlot index={2} className="bg-gray-900 border-gray-800" />
                    <InputOTPSlot index={3} className="bg-gray-900 border-gray-800" />
                  </InputOTPGroup>
                </InputOTP>
              </FormControl>
              <FormDescription>
                Ce PIN sera demandé pour valider vos paiements.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email (Optionnel)</FormLabel>
              <FormControl>
                <Input placeholder="votre.email@example.com" {...field} className="bg-gray-900 border-gray-800" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="space-y-4 pt-4">
          <FormField
            control={form.control}
            name="termsAccepted"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    J&apos;accepte les <a href="#" className="underline">termes et conditions</a>.
                  </FormLabel>
                </div>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="privacyAccepted"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    J&apos;accepte la <a href="#" className="underline">politique de confidentialité</a>.
                  </FormLabel>
                </div>
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Création en cours...
            </>
          ) : (
            'Créer le compte'
          )}
        </Button>
      </form>
    </Form>
  );
}