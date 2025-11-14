'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
// We will create this validation schema next
import { payDriverSchema } from '@/lib/validations/passenger-auth'; 
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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { toast as sonnerToast } from 'sonner';
import { Loader2 } from 'lucide-react';

/**
 * File: /components/forms/PayDriverForm.tsx
 * Purpose: The form to pay a driver by their ID.
 * Includes 4-digit PIN security as requested.
 */

type PayFormValues = z.infer<typeof payDriverSchema>;

export function PayDriverForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // We use the 'string' pattern that we know works
  const form = useForm<PayFormValues>({
    resolver: zodResolver(payDriverSchema),
    defaultValues: {
      amount: '',
      driverId: '',
      pin: '',
    },
  });

  const onSubmit: SubmitHandler<PayFormValues> = async (values) => {
    setIsLoading(true);
    
    // MOCK PAYMENT API CALL
    console.log('[MOCK PAY]', values);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // On success:
    sonnerToast.success('Paiement Effectué!', {
      description: `Vous avez payé ${values.amount} XAF au chauffeur ${values.driverId}.`,
    });
    
    form.reset();
    router.push('/home'); // Redirect to home on success
    
    setIsLoading(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        
        <FormField
          control={form.control}
          name="driverId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ID du Chauffeur</FormLabel>
              <FormControl>
                <Input 
                  placeholder="ID-CHAUFFEUR" 
                  {...field}
                  className="bg-gray-800 border-gray-700"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Montant (XAF)</FormLabel>
              <FormControl>
                <Input 
                  type="number"
                  placeholder="150" 
                  {...field}
                  className="bg-gray-800 border-gray-700"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* YOUR 4-DIGIT PIN SECURITY IDEA */}
        <FormField
          control={form.control}
          name="pin"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Votre Code PIN à 4 chiffres</FormLabel>
              <FormControl>
                <InputOTP maxLength={4} {...field} containerClassName="justify-start">
                  <InputOTPGroup className="text-white">
                    <InputOTPSlot index={0} className="bg-gray-800 border-gray-700" />
                    <InputOTPSlot index={1} className="bg-gray-800 border-gray-700" />
                    <InputOTPSlot index={2} className="bg-gray-800 border-gray-700" />
                    <InputOTPSlot index={3} className="bg-gray-800 border-gray-700" />
                  </InputOTPGroup>
                </InputOTP>
              </FormControl>
              <FormDescription>
                Pour valider la transaction.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            'Confirmer le Paiement'
          )}
        </Button>
      </form>
    </Form>
  );
}