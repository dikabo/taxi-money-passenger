import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { payDriverSchema } from '@/lib/validations/passenger-auth';
import { createCookieServerClient } from '@/lib/db/supabase-server';
import Passenger from '@/lib/db/models/Passenger';

/**
 * File: /app/api/payments/pay/route.ts
 * Purpose: API endpoint to process a payment to a driver.
 */

export async function POST(req: NextRequest) {
  const cookieStore = await cookies(); 

  try {
    // 1. Authentication
    const supabase = createCookieServerClient(cookieStore);
    const { data: { session }, } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // 2. Validate Body
    const body = await req.json();
    const validation = payDriverSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides.', details: validation.error.issues },
        { status: 400 }
      );
    }
    
    const { driverId, amount, pin } = validation.data;
    const amountAsNumber = Number(amount); // Convert string to number
    const passengerAuthId = session.user.id;

    // 3. YOUR PIN SECURITY CHECK
    // Get passenger from DB
    const passenger = await Passenger.findOne({ authId: passengerAuthId });
    if (!passenger) {
      return NextResponse.json({ error: 'Passager non trouvé.' }, { status: 404 });
    }

    // Compare PIN
    const isPinCorrect = await passenger.comparePin(pin);
    if (!isPinCorrect) {
      return NextResponse.json({ error: 'Code PIN incorrect.' }, { status: 403 });
    }

    // 4. MOCK PAYMENT LOGIC
    console.log(`[MOCK PAY] Paiement de: ${passengerAuthId}`);
    console.log(`[MOCK PAY] À Chauffeur: ${driverId}`);
    console.log(`[MOCK PAY] Montant: ${amountAsNumber} XAF`);

    // In a real app, we would:
    // 1. Start a MongoDB Transaction.
    // 2. Check if passenger.walletBalance >= amountAsNumber.
    // 3. Subtract 'amountAsNumber' from passenger.walletBalance.
    // 4. Find driver by 'driverId' (this will be complex, maybe by authId).
    // 5. Add 'amountAsNumber' to driver.earnings.
    // 6. Commit the transaction.
    // 7. Create a 'transaction' document.

    await new Promise(resolve => setTimeout(resolve, 2000));

    // 5. Return Success
    return NextResponse.json(
      {
        success: true,
        message: 'Paiement effectué avec succès.',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Pay API Error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation invalide', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Une erreur inattendue est survenue.' },
      { status: 500 }
    );
  }
}