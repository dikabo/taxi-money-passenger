'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { QrCode, Loader2, Scan } from 'lucide-react';
import { toast } from 'sonner';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Scanner } from '@yudiel/react-qr-scanner';

/**
 * File: /app/(dashboard)/pay/page.tsx
 * Purpose: The payment page for passengers to pay drivers.
 * ✅ UPDATED: Added QR scanner button that autofills driver ID
 */

export default function PayPage() {
  const router = useRouter();
  const [driverId, setDriverId] = useState('');
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  // Handle QR code scan
  const handleScan = (result: string) => {
    if (result) {
      console.log('[QR SCANNER] Scanned:', result);
      
      // Extract driver ID from scanned data
      // The QR code contains just the driver ID (e.g., "67890ABC")
      setDriverId(result.trim().toUpperCase());
      setShowScanner(false);
      
      toast.success('QR Code Scanné!', {
        description: `ID Chauffeur: ${result.trim().toUpperCase()}`,
      });
    }
  };

  const handlePayment = async () => {
    // Validate inputs
    if (!driverId.trim()) {
      toast.error('Erreur', {
        description: 'Veuillez entrer l\'ID du chauffeur',
      });
      return;
    }

    const paymentAmount = Number(amount);
    if (isNaN(paymentAmount) || paymentAmount < 100) {
      toast.error('Erreur', {
        description: 'Le montant minimum est de 100 Units',
      });
      return;
    }

    if (pin.length !== 4) {
      toast.error('Erreur', {
        description: 'Veuillez entrer votre code PIN à 4 chiffres',
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/payments/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: driverId.trim(),
          amount: paymentAmount,
          pin,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Paiement échoué');
      }

      toast.success('Paiement Effectué!', {
        description: `${paymentAmount} Units envoyés à ${result.driverName}. Nouveau solde: ${result.newBalance} Units`,
      });

      // Reset form
      setDriverId('');
      setAmount('');
      setPin('');
      
      // Redirect to home
      setTimeout(() => {
        router.push('/home');
      }, 1500);

    } catch (error) {
      let errorMessage = 'Une erreur inattendue est survenue.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error('Échec du paiement', {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <h1 className="text-2xl font-bold text-white">Payer un Chauffeur</h1>
      
      <Card className="bg-gray-900 border-gray-800 text-white">
        <CardHeader>
          <CardTitle>Détails du Paiement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Driver ID Field with QR Scanner Button */}
          <div className="space-y-2">
            <label className="text-sm font-medium">ID du Chauffeur</label>
            <div className="relative">
              <Input 
                placeholder="Ex: 67890ABC" 
                value={driverId}
                onChange={(e) => setDriverId(e.target.value.toUpperCase())}
                className="bg-gray-800 border-gray-700 text-white pr-12"
                disabled={isLoading}
              />
              {/* QR Scanner Button - positioned inside input at far right */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-gray-700"
                onClick={() => setShowScanner(true)}
                disabled={isLoading}
              >
                <Scan className="h-5 w-5 text-gray-400" />
              </Button>
            </div>
            <p className="text-xs text-gray-400">
              Entrez l&apos;ID ou cliquez sur l&apos;icône pour scanner le QR
            </p>
          </div>

          {/* Amount Field */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Montant (Units)</label>
            <Input 
              type="number"
              placeholder="100" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
              min="100"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-400">
              Montant minimum: 100 Units
            </p>
          </div>

          {/* PIN Field */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Votre Code PIN à 4 chiffres</label>
            <div className="flex justify-center">
              <InputOTP 
                maxLength={4} 
                value={pin}
                onChange={(value) => setPin(value)}
                disabled={isLoading}
              >
                <InputOTPGroup className="text-white">
                  <InputOTPSlot index={0} className="bg-gray-800 border-gray-700" />
                  <InputOTPSlot index={1} className="bg-gray-800 border-gray-700" />
                  <InputOTPSlot index={2} className="bg-gray-800 border-gray-700" />
                  <InputOTPSlot index={3} className="bg-gray-800 border-gray-700" />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <p className="text-xs text-gray-400 text-center">
              Pour valider la transaction
            </p>
          </div>

          {/* Submit Button */}
          <Button 
            className="w-full" 
            onClick={handlePayment}
            disabled={!driverId || !amount || pin.length !== 4 || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Traitement...
              </>
            ) : (
              'Confirmer le Paiement'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* QR Scanner Modal */}
      <Dialog open={showScanner} onOpenChange={setShowScanner}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle>Scanner le QR Code du Chauffeur</DialogTitle>
            <DialogDescription className="text-gray-400">
              Pointez votre caméra vers le QR code du chauffeur
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            <div className="w-full max-w-sm aspect-square bg-black rounded-lg overflow-hidden">
              <Scanner
                onScan={(result) => {
                  if (result && result[0]) {
                    handleScan(result[0].rawValue);
                  }
                }}
                onError={(error) => {
                  console.error('[QR SCANNER] Error:', error);
                  toast.error('Erreur de Scanner', {
                    description: 'Impossible d\'accéder à la caméra',
                  });
                }}
                styles={{
                  container: { width: '100%', height: '100%' },
                }}
              />
            </div>
            <Button 
              variant="outline" 
              onClick={() => setShowScanner(false)}
              className="w-full bg-gray-800 border-gray-700 hover:bg-gray-700"
            >
              Annuler
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}