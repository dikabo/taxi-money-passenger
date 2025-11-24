import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createCookieServerClient } from '@/lib/db/supabase-server';
import dbConnect from '@/lib/db/mongoose-connection';
import Passenger from '@/lib/db/models/Passenger';
import Transaction from '@/lib/db/models/Transaction';
import mongoose from 'mongoose';

/**
 * File: /app/api/payments/pay/route.ts
 * Purpose: Process passenger-to-driver payment
 * ✅ FIXED: Removed problematic duplicate check that was causing crashes
 */

// Define minimal Driver schema inline
const DriverSchema = new mongoose.Schema({
  authId: String,
  firstName: String,
  lastName: String,
  phoneNumber: String,
  email: String,
  vehicleType: String,
  vehicleColor: String,
  vehicleMake: String,
  vehicleModel: String,
  availableBalance: { type: Number, default: 0 },
}, { collection: 'drivers' });

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

    console.log('[PAYMENT API] Request received:', { driverId, amount, hasPin: !!pin });

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
      console.error('[PAYMENT API] Passenger not found for authId:', session.user.id);
      return NextResponse.json(
        { error: 'Passager non trouvé' },
        { status: 404 }
      );
    }

    console.log('[PAYMENT API] Passenger found:', passenger.firstName, passenger.lastName);

    // 5. Verify PIN
    const isPinCorrect = await passenger.comparePin(pin);

    if (!isPinCorrect) {
      console.error('[PAYMENT API] Incorrect PIN');
      return NextResponse.json(
        { error: 'Code PIN incorrect' },
        { status: 401 }
      );
    }

    // 6. Check balance
    if (passenger.wallet < paymentAmount) {
      console.error('[PAYMENT API] Insufficient balance:', passenger.wallet, '<', paymentAmount);
      return NextResponse.json(
        { error: 'Solde insuffisant' },
        { status: 400 }
      );
    }

    // 7. Find driver - ✅ IMPROVED: Better search with multiple formats
    let driver;
    
    // Clean up the driver ID
    const cleanDriverId = driverId.trim().toUpperCase();
    
    console.log('[PAYMENT API] Searching for driver with ID:', cleanDriverId);
    
    // Try to find by _id if it looks like a valid MongoDB ObjectId
    if (mongoose.Types.ObjectId.isValid(cleanDriverId)) {
      driver = await Driver.findById(cleanDriverId);
      console.log('[PAYMENT API] Search by ObjectId result:', driver ? 'Found' : 'Not found');
    }
    
    // If not found, try searching by the first 8 chars of _id (as shown on home page)
    if (!driver) {
      const allDrivers = await Driver.find({}).limit(100); // Limit for performance
      driver = allDrivers.find(d => {
        const shortId = String(d._id).substring(0, 8).toUpperCase();
        return shortId === cleanDriverId;
      });
      console.log('[PAYMENT API] Search by short ID result:', driver ? 'Found' : 'Not found');
    }
    
    // If still not found, try by authId
    if (!driver) {
      driver = await Driver.findOne({ authId: cleanDriverId });
      console.log('[PAYMENT API] Search by authId result:', driver ? 'Found' : 'Not found');
    }

    if (!driver) {
      console.error('[PAYMENT API] Driver not found for ID:', cleanDriverId);
      return NextResponse.json(
        { error: 'Chauffeur non trouvé. Vérifiez l\'ID du chauffeur.' },
        { status: 404 }
      );
    }

    console.log('[PAYMENT API] Driver found:', driver.firstName, driver.lastName);

    console.log('='.repeat(80));
    console.log('[PAYMENT] 💳 Processing payment');
    console.log(`[PAYMENT] From: ${passenger.firstName} ${passenger.lastName} (Balance: ${passenger.wallet})`);
    console.log(`[PAYMENT] To: ${driver.firstName} ${driver.lastName} (Balance: ${driver.availableBalance || 0})`);
    console.log(`[PAYMENT] Amount: ${paymentAmount} Units`);
    console.log('='.repeat(80));

    // 8. Transfer funds (simple approach without sessions for now)
    // Deduct from passenger
    passenger.wallet -= paymentAmount;
    await passenger.save();

    // Add to driver (ensure availableBalance exists)
    if (!driver.availableBalance) {
      driver.availableBalance = 0;
    }
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

    console.log('[PAYMENT] ✅ SUCCESS');
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
    console.error('[PAYMENT API] ❌ Error:', error);
    console.error('[PAYMENT API] Error stack:', error instanceof Error ? error.stack : 'No stack');
    
    return NextResponse.json(
      { 
        error: 'Une erreur est survenue',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}