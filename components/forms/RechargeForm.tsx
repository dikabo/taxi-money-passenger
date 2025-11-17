'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { rechargeSchema } from '@/lib/validations/passenger-auth';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast as sonnerToast } from 'sonner';
import { Loader2 } from 'lucide-react';

/**
 * File: /components/forms/RechargeForm.tsx
 * Purpose: Form for recharging passenger wallet via Fapshi.
 *
 * Features:
 * - Validates amount (100 - 5,000 XAF)
 * - Conditional phone input based on selected method
 * - Displays transaction ID on success
 * - Proper error handling and loading states
 * - Uses Fapshi webhook for balance updates
 */

type RechargeFormValues = z.infer<typeof rechargeSchema>;

interface RechargeFormProps {
  setOpen: (open: boolean) => void;
}

export function RechargeForm({ setOpen }: RechargeFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RechargeFormValues>({
    resolver: zodResolver(rechargeSchema),
    defaultValues: {
      amount: '',
      method: undefined,
      rechargePhoneNumber: '+237',
    },
  });

  // Watch method field to conditionally show phone input
  const selectedMethod = form.watch('method');

  const onSubmit: SubmitHandler<RechargeFormValues> = async (values) => {
    setIsLoading(true);

    try {
      // Call recharge API
      const response = await fetch('/api/payments/recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Une erreur inconnue est survenue');
      }

      // Success: Show transaction ID and instructions
      const transactionId = result.transactionId;
      sonnerToast.success('Rechargement initié!', {
        description: `Transaction ID: ${transactionId}\n\nVeuillez confirmer la transaction de ${values.amount} XAF sur le ${values.rechargePhoneNumber}. Vous recevrez un USSD pour valider.`,
      });

      setIsLoading(false);
      setOpen(false);
      form.reset();
      // Balance will update when Fapshi webhook is received

    } catch (error) {
      let errorMessage = 'Une erreur inattendue est survenue.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      sonnerToast.error('Échec du rechargement', {
        description: errorMessage,
      });
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

        {/* Amount Field */}
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Montant (XAF)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="5000"
                  {...field}
                  className="bg-gray-800 border-gray-700"
                />
              </FormControl>
              <FormDescription>
                Montant minimum: 100 XAF | Maximum: 5,000 XAF
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Payment Method Field */}
        <FormField
          control={form.control}
          name="method"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Méthode de paiement</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="bg-gray-800 border-gray-700">
                    <SelectValue placeholder="Choisir une méthode" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="MTN">MTN Mobile Money</SelectItem>
                  <SelectItem value="Orange">Orange Money</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Phone Number Field (Conditional) */}
        {selectedMethod && (
          <FormField
            control={form.control}
            name="rechargePhoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Numéro de téléphone ({selectedMethod})</FormLabel>
                <FormControl>
                  <Input
                    placeholder="+237XXXXXXXXX"
                    {...field}
                    className="bg-gray-800 border-gray-700"
                  />
                </FormControl>
                <FormDescription>
                  Le numéro {selectedMethod} qui sera débité. Format: +237XXXXXXXXX
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Submit Button */}
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Traitement...
            </>
          ) : (
            'Procéder au rechargement'
          )}
        </Button>
      </form>
    </Form>
  );
}