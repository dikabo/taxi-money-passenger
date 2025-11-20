import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongoose-connection';
import Passenger from '@/lib/db/models/Passenger';
import Transaction from '@/lib/db/models/Transaction';

/**
 * File: /app/api/webhooks/fapshi/route.ts
 * Purpose: Webhook API that Fapshi calls to notify transaction status.
 * This endpoint processes successful recharges/withdrawals and updates wallet balances.
 *
 * Flow:
 * 1. Extract transaction data from Fapshi payload
 * 2. Find corresponding transaction in DB using externalId
 * 3. Verify not already processed (idempotency check)
 * 4. Update wallet balance based on transaction status
 * 5. Mark transaction as Success/Failed
 * 6. Return 200 OK to Fapshi
 *
 * FIXED: Better logging and error handling for debugging
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log('='.repeat(80));
    console.log('[WEBHOOK] 📥 Received Fapshi webhook');
    console.log('[WEBHOOK] Payload:', JSON.stringify(body, null, 2));
    console.log('='.repeat(80));

    // Extract Fapshi webhook payload
    // Fapshi sends these fields (based on Direct Pay API docs):
    const fapshiTransactionId = body.transId; // Fapshi's transaction ID
    const externalId = body.externalId; // Our externalId sent in the request
    const amount = body.amount;
    const status = body.status; // e.g., "successful", "failed", "pending"
    const phone = body.phone;

    // Validate required fields
    if (!externalId || !status) {
      console.warn('[WEBHOOK] ⚠️ Invalid payload: missing externalId or status');
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    console.log(`[WEBHOOK] 🔍 Looking for transaction with externalId: ${externalId}`);

    // Connect to database
    await dbConnect();

    // Find transaction by externalId (this is how we map Fapshi response to our DB)
    const transaction = await Transaction.findOne({
      externalId: externalId,
    });

    if (!transaction) {
      console.warn(`[WEBHOOK] ❌ Transaction not found with externalId: ${externalId}`);
      // Still return 200 to prevent Fapshi from retrying
      return NextResponse.json({ error: 'Transaction not found' }, { status: 200 });
    }

    console.log(`[WEBHOOK] ✅ Found transaction: ${transaction._id}`);
    console.log(`[WEBHOOK] Current status: ${transaction.status}`);
    console.log(`[WEBHOOK] Transaction amount: ${transaction.amount} XAF`);

    // Idempotency check - prevent duplicate processing
    if (transaction.status !== 'Pending') {
      console.log(
        `[WEBHOOK] ⚠️ Transaction ${transaction._id} already processed (status: ${transaction.status}). Ignoring duplicate.`
      );
      return NextResponse.json({ message: 'Webhook already processed' }, { status: 200 });
    }

    // Process based on Fapshi status
    // Fapshi returns: "successful", "failed", or "pending"
    if (status === 'successful') {
      console.log(`[WEBHOOK] 💰 Processing successful payment`);
      
      // Add money to passenger's wallet
      const passenger = await Passenger.findOneAndUpdate(
        { _id: transaction.userId },
        { $inc: { wallet: transaction.amount } },
        { new: true }
      );

      if (!passenger) {
        console.error(`[WEBHOOK] ❌ Passenger not found: ${transaction.userId}`);
        throw new Error(
          `Passenger not found during webhook processing: ${transaction.userId}`
        );
      }

      // Update transaction with success status
      transaction.status = 'Success';
      transaction.fapshiTransactionId = fapshiTransactionId;
      await transaction.save();

      console.log('='.repeat(80));
      console.log(`[WEBHOOK] ✅ SUCCESS!`);
      console.log(`[WEBHOOK] Passenger: ${passenger.firstName} ${passenger.lastName}`);
      console.log(`[WEBHOOK] Amount recharged: ${transaction.amount} Units`);
      console.log(`[WEBHOOK] Old balance: ${passenger.wallet - transaction.amount} Units`);
      console.log(`[WEBHOOK] New balance: ${passenger.wallet} Units`);
      console.log(`[WEBHOOK] Transaction ID: ${transaction._id}`);
      console.log(`[WEBHOOK] Fapshi Transaction ID: ${fapshiTransactionId}`);
      console.log('='.repeat(80));

    } else if (status === 'failed') {
      // Payment failed at Fapshi - mark transaction as failed
      transaction.status = 'Failed';
      transaction.fapshiTransactionId = fapshiTransactionId;
      await transaction.save();

      console.log('='.repeat(80));
      console.log(`[WEBHOOK] ❌ FAILED`);
      console.log(`[WEBHOOK] User ID: ${transaction.userId}`);
      console.log(`[WEBHOOK] Amount: ${transaction.amount} Units`);
      console.log(`[WEBHOOK] Reason: Payment failed at Fapshi`);
      console.log('='.repeat(80));

    } else if (status === 'pending') {
      // Still waiting for confirmation
      console.log(`[WEBHOOK] ⏳ PENDING: Transaction ${transaction._id} still waiting`);
      // Don't update status yet, still Pending
    } else {
      console.warn(`[WEBHOOK] ⚠️ Unknown status: ${status}`);
    }

    // Acknowledge receipt to Fapshi
    return NextResponse.json(
      {
        success: true,
        message: 'Webhook received and processed',
        transactionId: transaction._id,
        status: transaction.status,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('='.repeat(80));
    console.error('[WEBHOOK] ❌ ERROR');
    console.error('[WEBHOOK] Error:', error);
    console.error('[WEBHOOK] Stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('='.repeat(80));

    // Always return 500 on server error (Fapshi will retry)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}