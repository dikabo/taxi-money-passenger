import { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QrCode, ScanLine } from 'lucide-react';
import { PayDriverFormWithQR } from '@/components/forms/PayDriverFormWithQR';

/**
 * File: /app/(dashboard)/pay/page.tsx
 * Purpose: Passenger pay page with working QR scanner
 * 
 * FIXED:
 * - QR scanner is now functional
 * - Integrated with driver ID input
 * - Both methods work seamlessly
 */

export const metadata: Metadata = {
  title: 'Payer | Taxi Money',
};

export default function PayPage() {
  return (
    <div className="flex flex-col h-full space-y-6">
      <h1 className="text-2xl font-bold text-white">Payer un Chauffeur</h1>
      
      <Tabs defaultValue="scan" className="w-full">
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
        
        {/* Scan QR Tab - NOW WORKING */}
        <TabsContent value="scan">
          <Card className="bg-gray-900 border-gray-800 text-white">
            <CardHeader>
              <CardTitle>Scanner le code QR du chauffeur</CardTitle>
            </CardHeader>
            <CardContent>
              <PayDriverFormWithQR method="scan" />
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Enter ID Tab */}
        <TabsContent value="id">
          <Card className="bg-gray-900 border-gray-800 text-white">
            <CardHeader>
              <CardTitle>Payer par ID Chauffeur</CardTitle>
            </CardHeader>
            <CardContent>
              <PayDriverFormWithQR method="id" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}