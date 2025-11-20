'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { QRScanner } from '@/components/forms/QRScanner';
import { toast as sonnerToast } from 'sonner';
import { Loader2 } from 'lucide-react';

/**
 * File: /components/forms/PayDriverFormWithQR.tsx
 * Purpose: Payment form with QR scanner integration
 * 
 * FIXED:
 * - QR scanner fully integrated
 * - Driver ID auto-filled from QR
 * - Seamless UX between scan and manual entry
 */

type PayFormValues = z.infer<typeof payDriverSchema>;

interface PayDriverFormWithQRProps {
  method: 'scan' | 'id';
}

export function PayDriverFormWithQR({ method }: PayDriverFormWithQRProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<PayFormValues>({
    resolver: zodResolver(payDriverSchema),
    defaultValues: {
      amount: '',
      driverId: '',
      pin: '',
    },
  });

  // Handle QR scan result
  const handleQRScan = (driverId: string) => {
    form.setValue('driverId', driverId);
    sonnerToast.success('Code QR scanné', {
      description: `ID Chauffeur: ${driverId}`,
    });
  };

  const onSubmit: SubmitHandler<PayFormValues> = async (values) => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/payments/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Paiement échoué');
      }

      sonnerToast.success('Paiement Effectué!', {
        description: `${values.amount} Units envoyés au chauffeur ${values.driverId}. Nouveau solde: ${result.newBalance} Units`,
      });

      form.reset();
      router.push('/home');

    } catch (error) {
      let errorMessage = 'Une erreur inattendue est survenue.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      sonnerToast.error('Échec du paiement', {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Show QR scanner for scan method
  if (method === 'scan') {
    return (
      <div className="space-y-6">
        {/* QR Scanner Component */}
        <QRScanner onScanSuccess={handleQRScan} />

        {/* Payment Form (after ID is scanned) */}
        {form.getValues('driverId') && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Driver ID (Read-only after scan) */}
              <FormItem>
                <FormLabel>ID du Chauffeur</FormLabel>
                <div className="p-3 bg-gray-800 rounded-md border border-gray-700 text-white">
                  {form.getValues('driverId')}
                </div>
              </FormItem>

              {/* Amount Field */}
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Montant (Units)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        placeholder="150" 
                        {...field}
                        className="bg-gray-800 border-gray-700"
                      />
                    </FormControl>
                    <FormDescription>
                      Montant minimum: 150 Units
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* PIN Field */}
              <FormField
                control={form.control}
                name="pin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Votre Code PIN à 4 chiffres</FormLabel>
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
                      Pour valider la transaction
                    </FormDescription>
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
                  'Confirmer le Paiement'
                )}
              </Button>
            </form>
          </Form>
        )}
      </div>
    );
  }

  // Show manual ID entry for id method
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
              <FormLabel>Montant (Units)</FormLabel>
              <FormControl>
                <Input 
                  type="number"
                  placeholder="150" 
                  {...field}
                  className="bg-gray-800 border-gray-700"
                />
              </FormControl>
              <FormDescription>
                Montant minimum: 150 Units
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
              <FormLabel>Votre Code PIN à 4 chiffres</FormLabel>
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
                Pour valider la transaction
              </FormDescription>
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
            'Confirmer le Paiement'
          )}
        </Button>
      </form>
    </Form>
  );
}