import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createCookieServerClient } from '@/lib/db/supabase-server';
import dbConnect from '@/lib/db/mongoose-connection';
import Passenger from '@/lib/db/models/Passenger';
import mongoose from 'mongoose';
import Transaction from '@/lib/db/models/Transaction';

/**
 * File: /app/api/payments/pay/route.ts
 * Purpose: Process passenger-to-driver payment
 * 
 * Flow:
 * 1. Authenticate passenger
 * 2. Verify PIN
 * 3. Check sufficient balance
 * 4. Find driver
 * 5. Transfer funds
 * 6. Create transaction records
 * 7. Return new balance
 */

// Define minimal Driver schema inline (read-only)
// This avoids importing from driver app
const DriverSchema = new mongoose.Schema({
  authId: String,
  firstName: String,
  lastName: String,
  phoneNumber: String,
  vehicleType: String,
  vehicleColor: String,
  vehicleMake: String,
  vehicleModel: String,
  availableBalance: Number,
}, { collection: 'drivers' }); // Explicitly set collection name

// Get or create model (handles hot-reload in development)
const Driver = mongoose.models.Driver || mongoose.model('Driver', DriverSchema);

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();

  try {
    // 1. Authenticate
    const supabase = createCookieServerClient(cookieStore);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // 2. Parse and validate request
    const body = await req.json();
    const { driverId, amount, pin } = body;

    if (!driverId || !amount || !pin) {
      return NextResponse.json(
        { error: 'Données manquantes' },
        { status: 400 }
      );
    }

    const paymentAmount = Number(amount);

    if (isNaN(paymentAmount) || paymentAmount < 150) {
      return NextResponse.json(
        { error: 'Montant invalide. Minimum: 150 Units' },
        { status: 400 }
      );
    }

    // 3. Connect to database
    await dbConnect();

    // 4. Get passenger
    const passenger = await Passenger.findOne({ authId: session.user.id });

    if (!passenger) {
      return NextResponse.json(
        { error: 'Passager non trouvé' },
        { status: 404 }
      );
    }

    // 5. Verify PIN
    const isPinCorrect = await passenger.comparePin(pin);

    if (!isPinCorrect) {
      return NextResponse.json(
        { error: 'Code PIN incorrect' },
        { status: 401 }
      );
    }

    // 6. Check balance
    if (passenger.wallet < paymentAmount) {
      return NextResponse.json(
        { error: 'Solde insuffisant' },
        { status: 400 }
      );
    }

    // 7. Find driver
    // Try to find by multiple possible ID formats
    const driver = await Driver.findOne({
      $or: [
        { _id: driverId },
        { authId: driverId },
        // Add more search patterns if needed
      ]
    });

    if (!driver) {
      return NextResponse.json(
        { error: 'Chauffeur non trouvé' },
        { status: 404 }
      );
    }

    // 8. Transfer funds
    // Deduct from passenger
    passenger.wallet -= paymentAmount;
    await passenger.save();

    // Add to driver
    driver.availableBalance += paymentAmount;
    await driver.save();

    // 9. Create transaction records
    const transactionNote = `Paiement de ${passenger.firstName} ${passenger.lastName} à ${driver.firstName} ${driver.lastName}`;

    // Passenger transaction (debit)
    await Transaction.create({
      userId: passenger._id,
      userType: 'Passenger',
      type: 'Payment',
      status: 'Success',
      amount: paymentAmount,
      method: 'Internal',
      phoneNumber: passenger.phoneNumber,
      notes: transactionNote,
    });

    // Driver transaction (credit)
    await Transaction.create({
      userId: driver._id,
      userType: 'Driver',
      type: 'Payment',
      status: 'Success',
      amount: paymentAmount,
      method: 'Internal',
      phoneNumber: driver.phoneNumber,
      notes: transactionNote,
    });

    console.log('='.repeat(80));
    console.log(`[PAYMENT] ✅ SUCCESS`);
    console.log(`[PAYMENT] From: ${passenger.firstName} ${passenger.lastName}`);
    console.log(`[PAYMENT] To: ${driver.firstName} ${driver.lastName}`);
    console.log(`[PAYMENT] Amount: ${paymentAmount} Units`);
    console.log(`[PAYMENT] Passenger new balance: ${passenger.wallet} Units`);
    console.log(`[PAYMENT] Driver new balance: ${driver.availableBalance} Units`);
    console.log('='.repeat(80));

    // 10. Return success
    return NextResponse.json({
      success: true,
      message: 'Paiement effectué avec succès',
      newBalance: passenger.wallet,
      driverName: `${driver.firstName} ${driver.lastName}`,
      amount: paymentAmount,
    });

  } catch (error) {
    console.error('[PAYMENT API] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Une erreur est survenue',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}