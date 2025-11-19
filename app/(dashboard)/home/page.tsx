import { cookies } from 'next/headers';
import { createCookieServerClient } from '@/lib/db/supabase-server';
import dbConnect from '@/lib/db/mongoose-connection';
import Passenger from '@/lib/db/models/Passenger';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { History, QrCode, Wallet } from 'lucide-react';
import { Metadata } from 'next';
import Link from 'next/link';
import { RechargeModalWrapper } from '@/components/dashboard/RechargeModalWrapper';
import { HistoryModal } from '@/components/dashboard/HistoryModal';

/**
 * File: /app/(dashboard)/home/page.tsx
 * Purpose: The main passenger dashboard.
 * CHANGED: XAF → Units for display
 */

export const metadata: Metadata = {
  title: 'Accueil | Taxi Money',
};

// Helper function to format currency (display as Units)
function formatUnits(amount: number) {
  return `${amount.toLocaleString('fr-CM')} Units`;
}

// Pattern to get data
async function getPassengerData() {
  const cookieStore = await cookies();
  const supabase = createCookieServerClient(cookieStore);

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return redirect('/signup');
  }

  await dbConnect();
  const passenger = await Passenger.findOne({ authId: session.user.id });
  if (!passenger) {
    return redirect('/signup');
  }
  
  const lastTransaction = {
    type: 'Paiement au Chauffeur',
    amount: 150,
    timestamp: new Date().toISOString(),
  };

  return { passenger, lastTransaction };
}

export default async function HomePage() {
  const { passenger, lastTransaction } = await getPassengerData();

  const passengerName = passenger.firstName;
  const WalletBalance = passenger.wallet;
  const passengerId = passenger.authId.substring(0, 8).toUpperCase();

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Bonjour, {passengerName}</h1>
          <p className="text-sm text-gray-400">ID Passager: {passengerId}</p>
        </div>
      </div>

      {/* Wallet Balance Card - CHANGED: XAF → Units */}
      <Card className="bg-gray-900 border-gray-800 text-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Solde de votre portefeuille</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{formatUnits(WalletBalance)}</div>
        </CardContent>
      </Card>

      <RechargeModalWrapper />

      {/* Full-Width Pay Button */}
      <Link href="/pay">
        <Card className="bg-card bg-gray-900 border-gray-800 hover:bg-gray-800 cursor-pointer">
          <CardContent className="flex flex-row items-center justify-center p-6 space-x-4">
            <QrCode className="h-8 w-8" />
            <span className="text-lg font-medium">Payer (Scan/ID)</span>
          </CardContent>
        </Card>
      </Link>

      {/* Last Transaction */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-semibold">Activité récente</h2>
          <HistoryModal>
            <Button variant="link" className="p-0 text-white">
              Voir tout
            </Button>
          </HistoryModal>
        </div>
        
        <Card className="bg-card bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-800 rounded-full">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">{lastTransaction.type}</p>
                  <p className="text-sm text-gray-400">
                    {new Date(lastTransaction.timestamp).toLocaleTimeString('fr-FR')}
                  </p>
                </div>
              </div>
              <div className="text-lg font-bold text-red-400">
                -{formatUnits(lastTransaction.amount)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}