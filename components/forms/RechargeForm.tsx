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
 * Fichier: /components/forms/RechargeForm.tsx
 * Objectif: Le formulaire pour recharger un portefeuille (via Fapshi).
 */

type RechargeFormValues = z.infer<typeof rechargeSchema>;

// L'argument 'setOpen' fermera le modal en cas de succès
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
      method: '', 
    },
  });

  const onSubmit: SubmitHandler<RechargeFormValues> = async (values) => {
    setIsLoading(true);

    // MOCK FAPSHI API CALL
    console.log('[MOCK RECHARGE]', values);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Au succès:
    sonnerToast.success('Rechargement initié!', {
      description: `Veuillez confirmer la transaction de ${values.amount} XAF sur votre téléphone.`,
    });

    setIsLoading(false);
    setOpen(false); // Ferme le modal
    form.reset();
    router.refresh(); // Rafraîchit la page d'accueil pour le nouveau solde
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  className="bg-gray-800 border-gray-700"
                  disabled={isLoading}
                />
              </FormControl>
              <FormDescription>Minimum 100 XAF.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="method"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Méthode de paiement</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                value={field.value}
                disabled={isLoading}
              >
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