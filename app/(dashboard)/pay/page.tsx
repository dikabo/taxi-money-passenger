'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { QRScanner } from '@/components/forms/QRScanner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * File: /app/pay/page.tsx
 * Purpose: Payment page with QR scanner integration
 * 
 * Flow:
 * 1. Scan QR or enter ID manually
 * 2. Enter payment amount
 * 3. Enter PIN to confirm
 * 4. Process payment
 */

export default function PayPage() {
  const router = useRouter();
  const [step, setStep] = useState<'scan' | 'payment'>('scan');
  const [driverId, setDriverId] = useState('');
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleScanSuccess = (scannedId: string) => {
    setDriverId(scannedId);
    setStep('payment');
  };

  const handlePayment = async () => {
    // Validate inputs
    if (!amount || Number(amount) < 150) {
      toast.error('Montant invalide', {
        description: 'Le montant minimum est de 150 Units',
      });
      return;
    }

    if (pin.length !== 4) {
      toast.error('PIN invalide', {
        description: 'Le code PIN doit contenir 4 chiffres',
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/payments/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId,
          amount: Number(amount),
          pin,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Paiement échoué');
      }

      toast.success('Paiement réussi!', {
        description: `${amount} Units envoyés au chauffeur. Nouveau solde: ${result.newBalance} Units`,
      });

      // Reset and go home
      setTimeout(() => {
        router.push('/home');
      }, 1500);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue';
      toast.error('Échec du paiement', {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'payment') {
      setStep('scan');
      setAmount('');
      setPin('');
    } else {
      router.push('/home');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-black p-6">
      {/* Header */}
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="mr-3"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-2xl font-bold text-white">
          {step === 'scan' ? 'Scanner le code' : 'Confirmer le paiement'}
        </h1>
      </div>

      {/* Step 1: QR Scanner */}
      {step === 'scan' && (
        <QRScanner onScanSuccess={handleScanSuccess} />
      )}

      {/* Step 2: Payment Details */}
      {step === 'payment' && (
        <div className="space-y-6">
          {/* Driver Info */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Chauffeur</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-3 bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-400 mb-1">ID Chauffeur</p>
                <p className="text-lg font-mono font-semibold text-white">
                  {driverId}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Amount Input */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Montant</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Input
                  type="number"
                  placeholder="Montant en Units"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white text-2xl h-14"
                  min="150"
                />
                <p className="text-sm text-gray-400 mt-2">
                  Montant minimum: 150 Units
                </p>
              </div>

              {/* Quick amounts */}
              <div className="grid grid-cols-3 gap-2">
                {[500, 1000, 2000].map((quickAmount) => (
                  <Button
                    key={quickAmount}
                    variant="outline"
                    onClick={() => setAmount(quickAmount.toString())}
                    className="bg-gray-800 border-gray-700 hover:bg-gray-700"
                  >
                    {quickAmount}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* PIN Input */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Code PIN</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                <InputOTP
                  maxLength={4}
                  value={pin}
                  onChange={setPin}
                  containerClassName="gap-3"
                >
                  <InputOTPGroup className="gap-3">
                    <InputOTPSlot 
                      index={0} 
                      className="bg-gray-800 border-gray-700 text-white w-14 h-14 text-2xl"
                    />
                    <InputOTPSlot 
                      index={1} 
                      className="bg-gray-800 border-gray-700 text-white w-14 h-14 text-2xl"
                    />
                    <InputOTPSlot 
                      index={2} 
                      className="bg-gray-800 border-gray-700 text-white w-14 h-14 text-2xl"
                    />
                    <InputOTPSlot 
                      index={3} 
                      className="bg-gray-800 border-gray-700 text-white w-14 h-14 text-2xl"
                    />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <p className="text-sm text-gray-400 text-center">
                Entrez votre code PIN à 4 chiffres
              </p>
            </CardContent>
          </Card>

          {/* Confirm Button */}
          <Button
            onClick={handlePayment}
            disabled={!amount || !pin || pin.length !== 4 || isLoading}
            className="w-full h-14 text-lg"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Traitement en cours...
              </>
            ) : (
              `Payer ${amount || '0'} Units`
            )}
          </Button>
        </div>
      )}
    </div>
  );
}