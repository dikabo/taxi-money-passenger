import { cookies } from 'next/headers';
import { createCookieServerClient } from '@/lib/db/supabase-server';
import dbConnect from '@/lib/db/mongoose-connection';
import Passenger from '@/lib/db/models/Passenger';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Smartphone, History, KeyRound } from 'lucide-react';
import { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { HistoryModal } from '@/components/dashboard/HistoryModal';
import { LogoutButton } from '@/components/dashboard/LogoutButton';

/**
 * File: /app/(dashboard)/profile/page.tsx
 * Purpose: The passenger's profile page, displaying their real data.
 */

export const metadata: Metadata = {
  title: 'Profil | Taxi Money',
};

// Helper function to fetch the passenger data
async function getPassengerData() {
  const cookieStore = await cookies();
  const supabase = createCookieServerClient(cookieStore);

  const { data: { session }, } = await supabase.auth.getSession();
  if (!session) {
    return redirect('/login');
  }

  await dbConnect();
  const passenger = await Passenger.findOne({ authId: session.user.id });
  if (!passenger) {
    return redirect('/login');
  }

  return passenger;
}

// A simple component to display a piece of data
function InfoRow({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className="flex justify-between items-center py-3 border-b border-gray-800">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="font-medium text-white">{value || 'N/A'}</span>
    </div>
  );
}

export default async function ProfilePage() {
  const passenger = await getPassengerData();

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <div className="p-3 bg-gray-800 rounded-full">
          <User className="h-8 w-8 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">
            {passenger.firstName} {passenger.lastName}
          </h1>
          <p className="text-sm text-gray-400">ID: {passenger.authId.substring(0, 8).toUpperCase()}</p>
        </div>
      </div>

      {/* Contact Information Card */}
      <Card className="bg-card bg-gray-900 border-gray-800">
        <CardHeader className="flex flex-row items-center space-x-3 pb-4">
          <Smartphone className="h-5 w-5 text-gray-400" />
          <CardTitle className="text-lg">Contact</CardTitle>
        </CardHeader>
        <CardContent>
          <InfoRow label="Numéro" value={passenger.phoneNumber} />
          <InfoRow label="Email" value={passenger.email} />
        </CardContent>
      </Card>

      {/* Security and History Card */}
      <Card className="bg-card bg-gray-900 border-gray-800">
        <CardHeader className="flex flex-row items-center space-x-3 pb-4">
          <KeyRound className="h-5 w-5 text-gray-400" />
          <CardTitle className="text-lg">Sécurité & Historique</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col space-y-2">
          {/* ✅ FIXED: HistoryModal with card button trigger */}
          <HistoryModal>
            <Button variant="outline" className="w-full justify-start bg-gray-800 border-gray-700 hover:bg-gray-700">
              <History className="h-4 w-4 mr-2" />
              Voir l&apos;historique
            </Button>
          </HistoryModal>
          
          <Button variant="outline" className="w-full justify-start bg-gray-800 border-gray-700 hover:bg-gray-700">
            <KeyRound className="h-4 w-4 mr-2" />
            Changer le code PIN
          </Button>
        </CardContent>
      </Card>

      {/* Logout Button */}
      <div className="pt-4">
        <LogoutButton />
      </div>
    </div>
  );
}