'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { QrCode, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';

export default function PayPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('id');
  const [driverId, setDriverId] = useState('');
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handlePayment = async () => {
    // Validate inputs
    if (!driverId.trim()) {
      toast.error('Erreur', {
        description: 'Veuillez entrer l\'ID du chauffeur',
      });
      return;
    }

    const paymentAmount = Number(amount);
    if (isNaN(paymentAmount) || paymentAmount < 150) {
      toast.error('Erreur', {
        description: 'Le montant minimum est de 150 Units',
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
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-900">
          <TabsTrigger value="id">
            <QrCode className="h-4 w-4 mr-2" />
            Entrer ID
          </TabsTrigger>
          <TabsTrigger value="scan" disabled>
            Scanner QR (Bientôt)
          </TabsTrigger>
        </TabsList>
        
        {/* Enter ID Tab - COMPLETE PAYMENT FORM */}
        <TabsContent value="id">
          <Card className="bg-gray-900 border-gray-800 text-white">
            <CardHeader>
              <CardTitle>Payer par ID Chauffeur</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Driver ID Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium">ID du Chauffeur</label>
                <Input 
                  placeholder="Ex: 67890ABC ou ID-CHAUFFEUR" 
                  value={driverId}
                  onChange={(e) => setDriverId(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-400">
                  Demandez l&apos;ID au chauffeur ou scannez son code QR
                </p>
              </div>

              {/* Amount Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Montant (Units)</label>
                <Input 
                  type="number"
                  placeholder="150" 
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                  min="150"
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-400">
                  Montant minimum: 150 Units
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
        </TabsContent>

        {/* Scan QR Tab - Coming Soon */}
        <TabsContent value="scan">
          <Card className="bg-gray-900 border-gray-800 text-white">
            <CardContent className="pt-6 text-center space-y-4">
              <p className="text-gray-400">
                La fonctionnalité de scan QR sera bientôt disponible
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}