import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/db/mongoose-connection';
import Passenger from '@/lib/db/models/Passenger';
import Transaction from '@/lib/db/models/Transaction';

/**
 * File: /app/api/webhooks/fapshi/route.ts
 * Purpose: Webhook API that Fapshi calls to notify transaction status.
 * This endpoint processes successful recharges/withdrawals and updates wallet balances.
 *
 * Security:
 * - Verifies webhook signature using HMAC-SHA256
 * - Prevents duplicate processing with idempotency check
 * - Validates transaction type and status
 * - Uses atomic MongoDB operations
 *
 * Flow:
 * 1. Verify Fapshi webhook signature
 * 2. Extract transaction data from payload
 * 3. Find corresponding transaction in DB
 * 4. Verify not already processed (idempotency)
 * 5. Update wallet balance based on transaction type & status
 * 6. Mark transaction as Success/Failed
 * 7. Return 200 OK to Fapshi
 */

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);

    // 1. Verify Webhook Signature (SECURITY CRITICAL)
    const signature = req.headers.get('x-fapshi-signature');
    
    if (!signature) {
      console.warn('[WEBHOOK] Missing signature header');
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    const webhookSecret = process.env.FAPSHI_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('[WEBHOOK] FAPSHI_WEBHOOK_SECRET not configured');
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.warn(`[WEBHOOK] Invalid signature. Expected: ${expectedSignature}, Got: ${signature}`);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    console.log('[WEBHOOK] Signature verified ✓');

    // 2. Extract Fapshi webhook payload
    // TODO: Verify against actual Fapshi webhook documentation
    const status = body.status; // e.g., "SUCCESS" or "FAILED"
    const fapshiTransactionId = body.transaction_id;
    const ourExternalId = body.external_id; // This is our Transaction._id

    if (!ourExternalId || !status) {
      console.warn('[WEBHOOK] Invalid payload: missing external_id or status');
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    // 3. Connect and find transaction
    await dbConnect();
    const transaction = await Transaction.findById(ourExternalId);

    if (!transaction) {
      console.warn(`[WEBHOOK] Transaction not found: ${ourExternalId}`);
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // 4. Idempotency check - prevent duplicate processing
    if (transaction.status !== 'Pending') {
      console.log(`[WEBHOOK] Transaction ${ourExternalId} already processed (status: ${transaction.status})`);
      return NextResponse.json({ message: 'Webhook already processed' }, { status: 200 });
    }

    // 5. Validate transaction type (passenger app only handles Recharge)
    if (transaction.type !== 'Recharge') {
      console.error(`[WEBHOOK] Invalid transaction type for passenger app: ${transaction.type}`);
      return NextResponse.json({ error: 'Invalid transaction type' }, { status: 400 });
    }

    console.log(`[WEBHOOK] Processing ${transaction.type} transaction for user ${transaction.userId}`);

    // 6. Handle based on status
    if (status === 'SUCCESS') {
      // Add money to passenger's wallet
      const passenger = await Passenger.findOneAndUpdate(
        { _id: transaction.userId },
        { $inc: { walletBalance: transaction.amount } },
        { new: true }
      );

      if (!passenger) {
        throw new Error(`Passenger not found during webhook processing: ${transaction.userId}`);
      }

      console.log(
        `[WEBHOOK] SUCCESS: Recharged ${transaction.amount} XAF for passenger ${passenger.firstName}. ` +
        `New balance: ${passenger.walletBalance}`
      );

      // Update transaction with success status and Fapshi ID
      transaction.status = 'Success';
      transaction.fapshiTransactionId = fapshiTransactionId;
      await transaction.save();

    } else {
      // Payment failed at Fapshi
      transaction.status = 'Failed';
      transaction.fapshiTransactionId = fapshiTransactionId;
      await transaction.save();

      console.log(`[WEBHOOK] FAILED: Recharge for passenger ${transaction.userId}`);
    }

    // 7. Acknowledge receipt to Fapshi
    return NextResponse.json(
      { message: 'Webhook received and processed', transactionId: ourExternalId },
      { status: 200 }
    );

  } catch (error) {
    console.error('[WEBHOOK] Fapshi webhook error:', error);
    
    // Always return 500 on server error (Fapshi will retry)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}