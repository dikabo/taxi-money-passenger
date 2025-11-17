import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { rechargeSchema } from '@/lib/validations/passenger-auth';
import { createCookieServerClient } from '@/lib/db/supabase-server';
import dbConnect from '@/lib/db/mongoose-connection';
import Passenger from '@/lib/db/models/Passenger';
import Transaction, { ITransaction } from '@/lib/db/models/Transaction';

/**
 * File: /app/api/payments/recharge/route.ts
 * Purpose: API endpoint to INITIATE a wallet recharge request.
 *
 * Flow:
 * 1. Authenticate user via Supabase
 * 2. Validate recharge request data
 * 3. Check passenger exists
 * 4. Create PENDING transaction in MongoDB
 * 5. Call Fapshi /deposit API
 * 6. Update transaction with Fapshi ID on success
 * 7. Return response to client
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

    // 3. Get Passenger from DB
    await dbConnect();
    const passenger = await Passenger.findOne({ authId: session.user.id });

    if (!passenger) {
      return NextResponse.json({ error: 'Passager non trouvé' }, { status: 404 });
    }

    // 4. Create PENDING Transaction
    // ✅ Properly typed and casted
    const transaction = (await Transaction.create({
      userId: passenger._id,
      userType: 'Passenger',
      type: 'Recharge',
      status: 'Pending',
      amount: amountAsNumber, // Recharge is positive
      method: method,
      phoneNumber: rechargePhoneNumber,
    })) as ITransaction;

    const transactionId = transaction._id?.toString() || '';

    console.log(`[API] Created PENDING transaction: ${transactionId}`);
    console.log(`[API] Amount: ${amountAsNumber} XAF`);
    console.log(`[API] Phone: ${rechargePhoneNumber}`);

    // 5. Call Fapshi /deposit
    console.log('[API] Calling Fapshi /deposit...');

    try {
      const fapshiResponse = await fetch(
        `${process.env.NEXT_PUBLIC_FAPSHI_API_BASE}/deposit`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.FAPSHI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: amountAsNumber,
            phone: rechargePhoneNumber,
            external_id: transactionId,
            webhook_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/fapshi`,
          }),
        }
      );

      if (!fapshiResponse.ok) {
        await Transaction.findByIdAndUpdate(transactionId, { status: 'Failed' });
        throw new Error('Fapshi API returned error');
      }

      const fapshiResult = await fapshiResponse.json();

      // 6. Update transaction with Fapshi ID
      await Transaction.findByIdAndUpdate(transactionId, {
        fapshiTransactionId: fapshiResult.transaction_id,
      });

      console.log(`[API] Fapshi accepted deposit: ${fapshiResult.transaction_id}`);
    } catch (fapshiError) {
      console.error('[API] Fapshi error:', fapshiError);
      await Transaction.findByIdAndUpdate(transactionId, { status: 'Failed' });
      throw fapshiError;
    }

    // 7. Return Success Response
    return NextResponse.json(
      {
        success: true,
        message: 'Demande de rechargement initiée. Veuillez valider sur votre téléphone.',
        transactionId: transactionId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Recharge API] Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation invalide', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Une erreur inattendue est survenue' },
      { status: 500 }
    );
  }
}