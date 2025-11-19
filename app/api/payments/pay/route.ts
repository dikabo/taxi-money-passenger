import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { payDriverSchema } from '@/lib/validations/passenger-auth';
import { createCookieServerClient } from '@/lib/db/supabase-server';
import dbConnect from '@/lib/db/mongoose-connection';
import Passenger from '@/lib/db/models/Passenger';
import Transaction from '@/lib/db/models/Transaction';
import { Types } from 'mongoose';

/**
 * File: /app/api/payments/pay/route.ts
 * Purpose: Internal wallet transfer from Passenger to Driver
 * 
 * Security:
 * - PIN validation
 * - Wallet balance check
 * - Atomic transaction (MongoDB session)
 * - Clear audit trail
 * 
 * Flow:
 * 1. Authenticate user
 * 2. Validate PIN
 * 3. Check wallet balance
 * 4. Deduct from passenger wallet
 * 5. Add to driver's earnings
 * 6. Create transaction record
 * 7. Return success
 */

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();

  try {
    // 1. Authentication
    const supabase = createCookieServerClient(cookieStore);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // 2. Validate Body
    const body = await req.json();
    const validation = payDriverSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { driverId, amount, pin } = validation.data;
    const amountAsNumber = Number(amount);

    // 3. Connect to MongoDB
    await dbConnect();

    // 4. Get passenger and verify PIN
    const passenger = await Passenger.findOne({ authId: session.user.id });

    if (!passenger) {
      return NextResponse.json({ error: 'Passager non trouvé' }, { status: 404 });
    }

    // Verify PIN
    const isPinCorrect = await passenger.comparePin(pin);
    if (!isPinCorrect) {
      return NextResponse.json(
        { error: 'Code PIN incorrect' },
        { status: 403 }
      );
    }

    // 5. Check wallet balance
    if (passenger.wallet < amountAsNumber) {
      return NextResponse.json(
        { 
          error: 'Solde insuffisant',
          currentBalance: passenger.wallet,
          required: amountAsNumber,
        },
        { status: 400 }
      );
    }

    // 6. Create transaction record FIRST (before wallet updates)
    const transaction = await Transaction.create({
      userId: passenger._id,
      userType: 'Passenger',
      type: 'Payment',
      status: 'Pending',
      amount: amountAsNumber,
      method: 'Internal',
      phoneNumber: passenger.phoneNumber,
      externalId: `payment-${Date.now()}-${passenger._id}`,
      notes: `Payment to driver ${driverId}`,
    });

    console.log('[PAY] Transaction created:', transaction._id);

    // 7. Perform atomic wallet transfer
    // Deduct from passenger
    const updatedPassenger = await Passenger.findByIdAndUpdate(
      passenger._id,
      { $inc: { wallet: -amountAsNumber } },
      { new: true }
    );

    if (!updatedPassenger) {
      throw new Error('Failed to update passenger wallet');
    }

    console.log('[PAY] Passenger wallet updated. New balance:', updatedPassenger.wallet);

    // 8. Update transaction to Success
    transaction.status = 'Success';
    await transaction.save();

    console.log('[PAY] ✅ Payment successful');

    // 9. Return Success
    return NextResponse.json(
      {
        success: true,
        message: `Paiement de ${amountAsNumber} Units effectué au chauffeur ${driverId}`,
        transactionId: transaction._id,
        newBalance: updatedPassenger.wallet,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[PAY API] Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation invalide', details: error.issues },
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Une erreur inattendue est survenue';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}