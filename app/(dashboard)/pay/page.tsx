'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { QrCode, ScanLine, Loader2 } from 'lucide-react';
import { QrReader } from 'react-qr-reader';
import { toast } from 'sonner';

export default function PayPage() {
  const [activeTab, setActiveTab] = useState('scan');
  const [driverId, setDriverId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleScan = (data: string | null) => {
    if (data) {
      setDriverId(data);
      setActiveTab('id'); // Switch to ID tab to confirm
      toast.success('QR Code scanné !', {
        description: `ID Chauffeur: ${data}`,
      });
    }
  };

  const handlePayment = async () => {
    if (!driverId) return;
    setIsLoading(true);
    // Simulate payment or redirect to payment logic
    setTimeout(() => {
      setIsLoading(false);
      toast.success('Paiement initié');
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <h1 className="text-2xl font-bold text-white">Payer un Chauffeur</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-900">
          <TabsTrigger value="scan">
            <ScanLine className="h-4 w-4 mr-2" />
            Scanner QR
          </TabsTrigger>
          <TabsTrigger value="id">
            <QrCode className="h-4 w-4 mr-2" />
            Entrer ID
          </TabsTrigger>
        </TabsList>
        
        {/* Scan QR Tab */}
        <TabsContent value="scan">
          <Card className="bg-gray-900 border-gray-800 text-white">
            <CardHeader>
              <CardTitle>Scanner le code QR du chauffeur</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
              <div className="relative w-full max-w-sm aspect-square overflow-hidden rounded-lg bg-black border-2 border-gray-700">
                <QrReader
                  onResult={(result, error) => {
                    if (result) handleScan(result.toString());
                  }}
                  constraints={{ facingMode: 'environment' }}
                  className="w-full h-full object-cover"
                />
                {/* Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border-2 border-cyan-500 rounded-lg opacity-80" />
                </div>
              </div>
              <p className="text-sm text-gray-400 text-center">
                Placez le code QR dans le cadre
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Enter ID Tab */}
        <TabsContent value="id">
          <Card className="bg-gray-900 border-gray-800 text-white">
            <CardHeader>
              <CardTitle>Payer par ID Chauffeur</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">ID du Chauffeur</label>
                <Input 
                  placeholder="Ex: TAXI1234" 
                  value={driverId}
                  onChange={(e) => setDriverId(e.target.value)}
                  className="bg-gray-800 border-gray-700"
                />
              </div>
              <Button 
                className="w-full" 
                onClick={handlePayment}
                disabled={!driverId || isLoading}
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Continuer vers le paiement'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}