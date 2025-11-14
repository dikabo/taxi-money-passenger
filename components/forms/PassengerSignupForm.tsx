'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
// We use the French validation schema
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
 *
 * THE FIX: The 'onSubmit' logic has been corrected
 * to handle API success/failure separately from navigation.
 */

type SignupFormValues = z.infer<typeof passengerSignupSchema>;

export function PassengerSignupForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(passengerSignupSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phoneNumber: '+237',
      password: '',
      pin: '',
      email: '',
      termsAccepted: false,
      privacyAccepted: false,
    },
  });

  // THIS IS THE CORRECTED LOGIC
  const onSubmit: SubmitHandler<SignupFormValues> = async (values) => {
    setIsLoading(true);
    let apiError = ''; // We will store any error here

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
        // If the API sends an error, store it
        apiError = result.error || 'Une erreur inconnue est survenue';
      }

    } catch (error) {
      // If the fetch itself fails
      console.error('Fetch Error:', error);
      apiError = 'Impossible de contacter le serveur. Veuillez réessayer.';
    }

    // Now, we handle the result *after* the try/catch
    if (apiError) {
      // --- FAILURE CASE ---
      sonnerToast.error('Échec de l\'inscription', {
        description: apiError,
      });
      setIsLoading(false); // Stop loading
    } else {
      // --- SUCCESS CASE ---
      sonnerToast.success('Compte créé avec succès!', {
        description: 'Un code OTP a été envoyé à votre téléphone.',
      });
      
      // Stop loading *before* we navigate
      setIsLoading(false); 
      
      // Safely navigate
      router.push(`/verify-otp?phone=${encodeURIComponent(values.phoneNumber)}`);
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
                <Input placeholder="+237699123456" {...field} className="bg-gray-900 border-gray-800" />
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
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            'Créer le compte'
          )}
        </Button>
      </form>
    </Form>
  );
}