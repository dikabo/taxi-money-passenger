import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createCookieServerClient } from '@/lib/db/supabase-server';
import dbConnect from '@/lib/db/mongoose-connection';
import Passenger from '@/lib/db/models/Passenger';
import Transaction from '@/lib/db/models/Transaction';
import mongoose, { Schema } from 'mongoose'; // Added Schema for clarity
import * as crypto from 'crypto'; // For generating unique IDs

/**
 * File: /app/api/payments/pay/route.ts
 * Purpose: Process passenger-to-driver payment
 *
 * CRITICAL FIXES MAINTAINED:
 * - Implemented MongoDB Session/Transaction for *atomic* fund transfer.
 * - Replaced time-based duplicate check with unique 'externalId' validation.
 *
 * ENVIRONMENT FIX:
 * - Removed external 'Driver' import and defined the model inline to avoid import errors 
 * in the Passenger application context.
 */

// Define minimal Driver schema inline (read-only, minimal fields needed for transaction)
const DriverSchema: Schema = new mongoose.Schema({
  authId: String,
  firstName: String,
  lastName: String,
  phoneNumber: String,
  availableBalance: { type: Number, default: 0 },
}, { collection: 'drivers' }); // IMPORTANT: Ensure the collection name matches the database

// Get or create model (handles hot-reload in development)
const Driver = mongoose.models.Driver || mongoose.model('Driver', DriverSchema);


export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  
  // Start the MongoDB session and transaction immediately
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Authenticate
    const supabase = createCookieServerClient(cookieStore);
    const { data: { session: authSession } } = await supabase.auth.getSession();

    if (!authSession) {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // 2. Parse and validate request
    const body = await req.json();
    const { driverId, amount, pin, externalId } = body;
    
    // Use an external ID provided by the client (or generate a UUID for true idempotency)
    const idempotencyKey = externalId || crypto.randomUUID();

    if (!driverId || !amount || !pin) {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json(
        { error: 'Données manquantes' },
        { status: 400 }
      );
    }

    const paymentAmount = Number(amount);

    if (isNaN(paymentAmount) || paymentAmount < 150) {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json(
        { error: 'Montant invalide. Minimum: 150 Units' },
        { status: 400 }
      );
    }

    // 3. Connect to database
    await dbConnect();

    // 4. Check for existing payment using the idempotency key (must happen before transaction logic)
    const existingTransaction = await Transaction.findOne({ externalId: idempotencyKey });
    if (existingTransaction) {
      console.log('[PAYMENT] ⚠️ DUPLICATE DETECTED - returning conflict based on externalId');
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json(
        { error: 'Cette transaction a déjà été effectuée.', duplicate: true },
        { status: 409 } // Conflict
      );
    }

    // 5. Get passenger (using session)
    const passenger = await Passenger.findOne({ authId: authSession.user.id }).session(session);

    if (!passenger) {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json(
        { error: 'Passager non trouvé' },
        { status: 404 }
      );
    }

    // 6. Verify PIN (read-only)
    const isPinCorrect = await passenger.comparePin(pin);

    if (!isPinCorrect) {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json(
        { error: 'Code PIN incorrect' },
        { status: 401 }
      );
    }

    // 7. Check balance
    if (passenger.wallet < paymentAmount) {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json(
        { error: 'Solde insuffisant' },
        { status: 400 }
      );
    }

    // 8. Find driver (using robust lookup and session)
    let driver;
    const cleanDriverId = driverId.trim().toUpperCase();

    // Try to find by _id if it looks like a valid MongoDB ObjectId
    if (mongoose.Types.ObjectId.isValid(cleanDriverId)) {
      driver = await Driver.findById(cleanDriverId).session(session);
    }

    // If not found, try searching by the first 8 chars of _id (short ID)
    if (!driver) {
        // Find driver outside the session, then re-fetch inside if found
        const potentialDriver = await Driver.find({});
        const foundByShortId = potentialDriver.find(d => 
            String(d._id).substring(0, 8).toUpperCase() === cleanDriverId
        );
        if (foundByShortId) {
            // Re-fetch using the session to ensure it's part of the transaction
            driver = await Driver.findById(foundByShortId._id).session(session);
        }
    }

    // If still not found, try by authId
    if (!driver) {
      driver = await Driver.findOne({ authId: cleanDriverId }).session(session);
    }

    if (!driver) {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json(
        { error: 'Chauffeur non trouvé. Vérifiez l\'ID du chauffeur.' },
        { status: 404 }
      );
    }

    console.log('='.repeat(80));
    console.log('[PAYMENT] 💳 Processing atomic payment');
    console.log(`[PAYMENT] From: ${passenger.firstName} ${passenger.lastName} (Balance: ${passenger.wallet})`);
    console.log(`[PAYMENT] To: ${driver.firstName} ${driver.lastName} (Balance: ${driver.availableBalance})`);
    console.log(`[PAYMENT] Amount: ${paymentAmount} Units`);
    console.log('='.repeat(80));

    // 9. Transfer funds (Update documents in memory)
    passenger.wallet -= paymentAmount;
    driver.availableBalance += paymentAmount;

    // Save both documents inside the transaction (atomic update)
    await passenger.save({ session });
    await driver.save({ session });

    // 10. Create transaction records
    const transactionNote = `Paiement de ${passenger.firstName} ${passenger.lastName} à ${driver.firstName} ${driver.lastName}`;

    // Create records inside the transaction (atomic creation)
    const [passengerTransaction] = await Transaction.create([{
      userId: passenger._id,
      userType: 'Passenger',
      type: 'Payment',
      status: 'Success',
      amount: paymentAmount,
      method: 'Internal',
      phoneNumber: passenger.phoneNumber,
      notes: transactionNote,
      externalId: idempotencyKey, 
    }], { session });

    await Transaction.create([{
      userId: driver._id,
      userType: 'Driver',
      type: 'Payment',
      status: 'Success',
      amount: paymentAmount,
      method: 'Internal',
      phoneNumber: driver.phoneNumber,
      notes: transactionNote,
      externalId: idempotencyKey, 
    }], { session });
    
    // 11. Commit the transaction
    await session.commitTransaction();
    session.endSession();

    console.log('[PAYMENT] ✅ ATOMIC SUCCESS');
    console.log(`[PAYMENT] Passenger new balance: ${passenger.wallet} Units`);
    console.log(`[PAYMENT] Driver new balance: ${driver.availableBalance} Units`);

    // 12. Return success
    return NextResponse.json({
      success: true,
      message: 'Paiement effectué avec succès',
      newBalance: passenger.wallet,
      driverName: `${driver.firstName} ${driver.lastName}`,
      amount: paymentAmount,
      transactionId: passengerTransaction._id,
    });

  } catch (error) {
    // Rollback the transaction on any error
    if (session.inTransaction()) {
        await session.abortTransaction();
    }
    session.endSession();

    console.error('[PAYMENT API] ❌ CRITICAL Error during transaction:', error);

    // If the error is a duplicate key error (E11000) for the externalId
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('E11000 duplicate key error')) {
        return NextResponse.json(
            { error: 'Cette transaction a déjà été enregistrée (erreur de clé unique).', duplicate: true },
            { status: 409 }
        );
    }
    
    return NextResponse.json(
      {
        error: 'Une erreur est survenue lors du transfert de fonds',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}