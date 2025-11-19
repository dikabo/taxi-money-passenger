import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QrCode, ScanLine } from 'lucide-react';
import { PayDriverForm } from '@/components/forms/PayDriverForm';

/**
 * File: /app/(dashboard)/pay/page.tsx
 * Purpose: The main "Pay" page with Scan/ID tabs.
 * CHANGED: XAF references → Units
 */

export const metadata: Metadata = {
  title: 'Payer | Taxi Money',
};

export default function PayPage() {
  return (
    <div className="flex flex-col h-full space-y-6">
      <h1 className="text-2xl font-bold text-white">Payer un Chauffeur</h1>
      
      <Tabs defaultValue="id" className="w-full">
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
          <Card className="bg-card bg-gray-900 border-gray-800">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center h-48">
                <ScanLine className="h-16 w-16 text-gray-500" />
                <p className="text-gray-400 mt-4">Fonctionnalité de scan bientôt disponible.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Enter ID Tab */}
        <TabsContent value="id">
          <Card className="bg-card bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle>Payer par ID Chauffeur</CardTitle>
            </CardHeader>
            <CardContent>
              <PayDriverForm />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}