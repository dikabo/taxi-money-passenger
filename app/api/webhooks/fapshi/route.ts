import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongoose-connection';
import Passenger from '@/lib/db/models/Passenger';
import Transaction from '@/lib/db/models/Transaction';

/**
 * File: /app/api/webhooks/fapshi/route.ts
 * Purpose: Webhook API that Fapshi calls to notify transaction status.
 * 
 * ✅ FIXED: Better logging, flexible status handling, and comprehensive error checking
 */

export async function POST(req: NextRequest) {
  try {
    // ============================================
    // STEP 1: Log EVERYTHING about the request
    // ============================================
    const body = await req.json();

    console.log('='.repeat(80));
    console.log('[WEBHOOK] 📥 FAPSHI WEBHOOK RECEIVED');
    console.log('[WEBHOOK] Timestamp:', new Date().toISOString());
    console.log('[WEBHOOK] Full payload:', JSON.stringify(body, null, 2));
    console.log('[WEBHOOK] Headers:', JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2));
    console.log('='.repeat(80));

    // ============================================
    // STEP 2: Extract webhook data with flexibility
    // ============================================
    // Fapshi might use different field names, so we check multiple possibilities
    const fapshiTransactionId = body.transId || body.transactionId || body.trans_id || body.id;
    const externalId = body.externalId || body.external_id || body.reference;
    const amount = body.amount;
    
    // ✅ FIX: Handle different status values Fapshi might send
    // Normalize status to lowercase for comparison
    const rawStatus = body.status || body.transaction_status || body.state;
    const normalizedStatus = rawStatus ? String(rawStatus).toLowerCase() : '';
    
    const phone = body.phone || body.phoneNumber || body.phone_number;

    console.log('[WEBHOOK] 🔍 Extracted fields:');
    console.log('[WEBHOOK]   - fapshiTransactionId:', fapshiTransactionId);
    console.log('[WEBHOOK]   - externalId:', externalId);
    console.log('[WEBHOOK]   - amount:', amount);
    console.log('[WEBHOOK]   - rawStatus:', rawStatus);
    console.log('[WEBHOOK]   - normalizedStatus:', normalizedStatus);
    console.log('[WEBHOOK]   - phone:', phone);

    // ============================================
    // STEP 3: Validate required fields
    // ============================================
    if (!externalId) {
      console.error('[WEBHOOK] ❌ ERROR: Missing externalId');
      console.error('[WEBHOOK] Available body fields:', Object.keys(body));
      return NextResponse.json({ 
        error: 'Missing externalId',
        received_fields: Object.keys(body),
        tip: 'Check Fapshi webhook documentation for correct field names'
      }, { status: 400 });
    }

    if (!normalizedStatus) {
      console.error('[WEBHOOK] ❌ ERROR: Missing status field');
      return NextResponse.json({ 
        error: 'Missing status',
        received_fields: Object.keys(body)
      }, { status: 400 });
    }

    // ============================================
    // STEP 4: Connect to database and find transaction
    // ============================================
    console.log(`[WEBHOOK] 🔍 Searching for transaction with externalId: ${externalId}`);
    
    await dbConnect();
    
    const transaction = await Transaction.findOne({
      externalId: externalId,
    });

    if (!transaction) {
      console.error(`[WEBHOOK] ❌ Transaction not found with externalId: ${externalId}`);
      // Return 200 to prevent Fapshi from retrying (this might be a test or duplicate)
      return NextResponse.json({ 
        error: 'Transaction not found',
        externalId: externalId,
        tip: 'This transaction may have already been processed or does not exist'
      }, { status: 200 });
    }

    console.log(`[WEBHOOK] ✅ Found transaction: ${transaction._id}`);
    console.log(`[WEBHOOK]    Current status: ${transaction.status}`);
    console.log(`[WEBHOOK]    Transaction type: ${transaction.type}`);
    console.log(`[WEBHOOK]    Transaction amount: ${transaction.amount} Units`);
    console.log(`[WEBHOOK]    User ID: ${transaction.userId}`);

    // ============================================
    // STEP 5: Idempotency check
    // ============================================
    if (transaction.status !== 'Pending') {
      console.log(`[WEBHOOK] ⚠️ DUPLICATE: Transaction already processed`);
      console.log(`[WEBHOOK]    Current status: ${transaction.status}`);
      console.log(`[WEBHOOK]    Ignoring duplicate webhook call`);
      
      return NextResponse.json({ 
        message: 'Webhook already processed',
        transactionId: transaction._id,
        currentStatus: transaction.status
      }, { status: 200 });
    }

    // ============================================
    // STEP 6: Process based on status
    // ============================================
    // ✅ FIX: Handle multiple possible success status values
    const isSuccess = [
      'successful',
      'success', 
      'completed',
      'approved',
      'paid'
    ].includes(normalizedStatus);

    const isFailed = [
      'failed',
      'failure',
      'declined',
      'rejected',
      'cancelled',
      'canceled'
    ].includes(normalizedStatus);

    const isPending = [
      'pending',
      'processing',
      'initiated',
      'awaiting'
    ].includes(normalizedStatus);

    console.log('[WEBHOOK] 📊 Status check:');
    console.log('[WEBHOOK]    isSuccess:', isSuccess);
    console.log('[WEBHOOK]    isFailed:', isFailed);
    console.log('[WEBHOOK]    isPending:', isPending);

    // ============================================
    // HANDLE SUCCESS
    // ============================================
    if (isSuccess) {
      console.log('[WEBHOOK] 💰 Processing SUCCESSFUL payment');
      
      try {
        // Find and update passenger wallet
        const passenger = await Passenger.findOneAndUpdate(
          { _id: transaction.userId },
          { $inc: { wallet: transaction.amount } },
          { new: true }
        );

        if (!passenger) {
          console.error(`[WEBHOOK] ❌ Passenger not found: ${transaction.userId}`);
          throw new Error(`Passenger not found: ${transaction.userId}`);
        }

        // Update transaction
        transaction.status = 'Success';
        transaction.fapshiTransactionId = fapshiTransactionId;
        await transaction.save();

        console.log('='.repeat(80));
        console.log('[WEBHOOK] ✅ ✅ ✅ SUCCESS! ✅ ✅ ✅');
        console.log('[WEBHOOK] Passenger:', passenger.firstName, passenger.lastName);
        console.log('[WEBHOOK] Phone:', passenger.phoneNumber);
        console.log('[WEBHOOK] Amount recharged:', transaction.amount, 'Units');
        console.log('[WEBHOOK] Previous balance:', passenger.wallet - transaction.amount, 'Units');
        console.log('[WEBHOOK] NEW BALANCE:', passenger.wallet, 'Units');
        console.log('[WEBHOOK] Transaction ID:', transaction._id);
        console.log('[WEBHOOK] Fapshi Transaction ID:', fapshiTransactionId);
        console.log('='.repeat(80));

        return NextResponse.json({
          success: true,
          message: 'Payment processed successfully',
          transactionId: transaction._id,
          status: 'Success',
          newBalance: passenger.wallet
        }, { status: 200 });
        
      } catch (updateError) {
        console.error('[WEBHOOK] ❌ Error updating wallet:', updateError);
        // Don't update transaction status on error
        throw updateError;
      }
    }

    // ============================================
    // HANDLE FAILURE
    // ============================================
    if (isFailed) {
      console.log('[WEBHOOK] ❌ Processing FAILED payment');
      
      transaction.status = 'Failed';
      transaction.fapshiTransactionId = fapshiTransactionId;
      await transaction.save();

      console.log('='.repeat(80));
      console.log('[WEBHOOK] ❌ PAYMENT FAILED');
      console.log('[WEBHOOK] User ID:', transaction.userId);
      console.log('[WEBHOOK] Amount:', transaction.amount, 'Units');
      console.log('[WEBHOOK] Reason:', body.message || body.error || 'Payment failed at Fapshi');
      console.log('[WEBHOOK] Transaction marked as Failed');
      console.log('='.repeat(80));

      return NextResponse.json({
        success: false,
        message: 'Payment failed',
        transactionId: transaction._id,
        status: 'Failed'
      }, { status: 200 });
    }

    // ============================================
    // HANDLE PENDING
    // ============================================
    if (isPending) {
      console.log('[WEBHOOK] ⏳ Payment still PENDING');
      console.log('[WEBHOOK] Transaction:', transaction._id);
      console.log('[WEBHOOK] Waiting for final status...');
      
      // Don't update status, keep as Pending
      return NextResponse.json({
        success: true,
        message: 'Payment still pending',
        transactionId: transaction._id,
        status: 'Pending'
      }, { status: 200 });
    }

    // ============================================
    // HANDLE UNKNOWN STATUS
    // ============================================
    console.warn('[WEBHOOK] ⚠️ UNKNOWN STATUS:', normalizedStatus);
    console.warn('[WEBHOOK] Raw status:', rawStatus);
    console.warn('[WEBHOOK] This status is not recognized!');
    console.warn('[WEBHOOK] Transaction will remain Pending');
    
    return NextResponse.json({
      success: false,
      message: 'Unknown payment status',
      receivedStatus: rawStatus,
      transactionId: transaction._id,
      tip: 'Contact Fapshi support to clarify webhook status values'
    }, { status: 200 });

  } catch (error) {
    // ============================================
    // ERROR HANDLING
    // ============================================
    console.error('='.repeat(80));
    console.error('[WEBHOOK] ❌ CRITICAL ERROR');
    console.error('[WEBHOOK] Error:', error);
    console.error('[WEBHOOK] Error name:', error instanceof Error ? error.name : typeof error);
    console.error('[WEBHOOK] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[WEBHOOK] Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('='.repeat(80));

    // Return 500 so Fapshi will retry
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
