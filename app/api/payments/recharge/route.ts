// ============================================================================
// FILE: /app/api/payments/recharge/route.ts
// FINAL VERSION: Using CORRECT Fapshi headers (apikey and apiuser)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { rechargeSchema } from '@/lib/validations/passenger-auth';
import { createCookieServerClient } from '@/lib/db/supabase-server';
import dbConnect from '@/lib/db/mongoose-connection';
import Passenger from '@/lib/db/models/Passenger';
import Transaction, { ITransaction } from '@/lib/db/models/Transaction';

/**
 * IMPORTANT: Fapshi Direct Pay API uses TWO headers:
 * - apikey: Your API key (FAK_...)
 * - apiuser: Your API user (same as apikey typically)
 * 
 * NOT Bearer token authentication
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
    const validation = rechargeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { amount, method, rechargePhoneNumber } = validation.data;
    const amountAsNumber = Number(amount);

    // Strip +237 prefix from phone number
    const phoneWithoutPrefix = rechargePhoneNumber.replace(/^\+237/, '');

    // Map method to Fapshi medium format
    const mediumMap: { [key: string]: string } = {
      'MTN': 'mobile money',
      'Orange': 'orange money',
    };
    const paymentMedium = mediumMap[method];

    // 3. Get Passenger from DB
    await dbConnect();
    const passenger = await Passenger.findOne({ authId: session.user.id });

    if (!passenger) {
      return NextResponse.json({ error: 'Passager non trouvé' }, { status: 404 });
    }

    const passengerId = passenger._id?.toString();

    if (!passengerId) {
      return NextResponse.json({ error: 'Passenger ID invalid' }, { status: 400 });
    }

    // 4. Create PENDING Transaction
    const externalId = `recharge-${Date.now()}-${passengerId}`;

    const transaction = (await Transaction.create({
      userId: passenger._id,
      userType: 'Passenger',
      type: 'Recharge',
      status: 'Pending',
      amount: amountAsNumber,
      method: method,
      phoneNumber: rechargePhoneNumber,
      externalId: externalId,
    })) as ITransaction;

    const transactionId = transaction._id?.toString() || '';

    console.log(`[API] Created PENDING transaction: ${transactionId}`);
    console.log(`[API] ExternalId: ${externalId}`);
    console.log(`[API] Amount: ${amountAsNumber} XAF`);
    console.log(`[API] Phone: ${phoneWithoutPrefix}`);
    console.log(`[API] Medium: ${paymentMedium}`);

    // 5. Call Fapshi Direct Pay API
    console.log('[API] Calling Fapshi Direct Pay...');

    const fapshiApiKey = process.env.FAPSHI_API_KEY;
    const fapshiApiUser = process.env.FAPSHI_API_USER;

    if (!fapshiApiKey || !fapshiApiUser) {
      throw new Error('FAPSHI_API_KEY and FAPSHI_API_USER must be configured');
    }

    try {
      // ✅ CORRECT: Use apikey and apiuser headers (NOT Bearer token)
      const fapshiResponse = await fetch(
        'https://api.fapshi.com/direct-pay',
        {
          method: 'POST',
          headers: {
            'apikey': fapshiApiKey,        // ✅ CORRECT
            'apiuser': fapshiApiUser,      // ✅ CORRECT
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: amountAsNumber,
            phone: phoneWithoutPrefix,
            medium: paymentMedium,
            externalId: externalId,
            userId: passengerId,
            message: 'Wallet recharge for transportation service',
          }),
        }
      );

      const fapshiResult = await fapshiResponse.json();

      if (!fapshiResponse.ok) {
        console.error('[API] Fapshi error response:', {
          status: fapshiResponse.status,
          body: fapshiResult,
        });
        await Transaction.findByIdAndUpdate(transactionId, { status: 'Failed' });
        throw new Error(fapshiResult.message || `Fapshi API error: ${fapshiResponse.status}`);
      }

      // 6. Update transaction with Fapshi transaction ID
      const fapshiTransactionId = fapshiResult.transId;

      await Transaction.findByIdAndUpdate(transactionId, {
        fapshiTransactionId: fapshiTransactionId,
      });

      console.log(`[API] ✅ Fapshi accepted recharge: ${fapshiTransactionId}`);

      // 7. Return Success Response
      return NextResponse.json(
        {
          success: true,
          message: 'Demande de rechargement initiée. Veuillez valider sur votre téléphone.',
          transId: fapshiTransactionId,
          transactionId: transactionId,
        },
        { status: 200 }
      );

    } catch (fapshiError) {
      console.error('[API] Fapshi error:', fapshiError);
      await Transaction.findByIdAndUpdate(transactionId, { status: 'Failed' });
      throw fapshiError;
    }

  } catch (error) {
    console.error('[Recharge API] Error:', error);

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