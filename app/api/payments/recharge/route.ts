import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { rechargeSchema } from '@/lib/validations/passenger-auth';
import { createCookieServerClient } from '@/lib/db/supabase-server';
import dbConnect from '@/lib/db/mongoose-connection';
import Passenger from '@/lib/db/models/Passenger';
import Transaction, { ITransaction } from '@/lib/db/models/Transaction';

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();

  try {
    console.log('[RECHARGE] ===== REQUEST START =====');

    // 1. Authentication
    console.log('[RECHARGE] Step 1: Authenticating with Supabase...');
    const supabase = createCookieServerClient(cookieStore);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      console.log('[RECHARGE] ❌ No session found');
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    console.log('[RECHARGE] ✅ Session found:', session.user.id);

    // 2. Validate Body
    console.log('[RECHARGE] Step 2: Validating request body...');
    const body = await req.json();
    console.log('[RECHARGE] Request body received:', body);
    
    const validation = rechargeSchema.safeParse(body);

    if (!validation.success) {
      console.log('[RECHARGE] ❌ Validation failed:', validation.error.issues);
      return NextResponse.json(
        { error: 'Données invalides', details: validation.error.issues },
        { status: 400 }
      );
    }
    console.log('[RECHARGE] ✅ Validation passed');

    const { amount, method, rechargePhoneNumber } = validation.data;
    const amountAsNumber = Number(amount);

    console.log('[RECHARGE] Amount:', amountAsNumber);
    console.log('[RECHARGE] Method:', method);
    console.log('[RECHARGE] Phone:', rechargePhoneNumber);

    // Strip prefix
    const phoneWithoutPrefix = rechargePhoneNumber.replace(/^\+237/, '');
    console.log('[RECHARGE] Phone (stripped):', phoneWithoutPrefix);

    // Map method
    const mediumMap: { [key: string]: string } = {
      'MTN': 'mobile money',
      'Orange': 'orange money',
    };
    const paymentMedium = mediumMap[method];
    console.log('[RECHARGE] Payment medium:', paymentMedium);

    // 3. Get Passenger from DB
    console.log('[RECHARGE] Step 3: Fetching passenger from DB...');
    await dbConnect();
    const passenger = await Passenger.findOne({ authId: session.user.id });

    if (!passenger) {
      console.log('[RECHARGE] ❌ Passenger not found');
      return NextResponse.json({ error: 'Passager non trouvé' }, { status: 404 });
    }
    console.log('[RECHARGE] ✅ Passenger found:', passenger._id);

    const passengerId = passenger._id?.toString();
    if (!passengerId) {
      console.log('[RECHARGE] ❌ Passenger ID is null');
      return NextResponse.json({ error: 'Passenger ID invalid' }, { status: 400 });
    }

    // 4. Create Transaction
    console.log('[RECHARGE] Step 4: Creating transaction...');
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
    console.log('[RECHARGE] ✅ Transaction created:', transactionId);
    console.log('[RECHARGE] ExternalId:', externalId);

    // 5. Call Fapshi
    console.log('[RECHARGE] Step 5: Calling Fapshi API...');

    const fapshiApiKey = process.env.FAPSHI_API_KEY;
    const fapshiApiUser = process.env.FAPSHI_API_USER;

    console.log('[RECHARGE] Checking credentials...');
    console.log('[RECHARGE] FAPSHI_API_KEY exists:', !!fapshiApiKey);
    console.log('[RECHARGE] FAPSHI_API_USER exists:', !!fapshiApiUser);

    if (!fapshiApiKey || !fapshiApiUser) {
      console.log('[RECHARGE] ❌ Missing Fapshi credentials');
      throw new Error('FAPSHI_API_KEY and FAPSHI_API_USER must be configured');
    }

    console.log('[RECHARGE] Making request to:', 'https://api.fapshi.com/direct-pay');
    console.log('[RECHARGE] Headers:', {
      'apikey': fapshiApiKey.substring(0, 10) + '...',
      'apiuser': fapshiApiUser.substring(0, 10) + '...',
      'Content-Type': 'application/json',
    });

    const requestBody = {
      amount: amountAsNumber,
      phone: phoneWithoutPrefix,
      medium: paymentMedium,
      externalId: externalId,
      userId: passengerId,
      message: 'Wallet recharge for transportation service',
    };
    console.log('[RECHARGE] Request body to Fapshi:', requestBody);

    const fapshiResponse = await fetch(
      'https://api.fapshi.com/direct-pay',
      {
        method: 'POST',
        headers: {
          'apikey': fapshiApiKey,
          'apiuser': fapshiApiUser,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    console.log('[RECHARGE] Fapshi response status:', fapshiResponse.status);
    console.log('[RECHARGE] Fapshi response headers:', Object.fromEntries(fapshiResponse.headers));

    const responseText = await fapshiResponse.text();
    console.log('[RECHARGE] Fapshi raw response:', responseText.substring(0, 500));

    let fapshiResult;
    try {
      fapshiResult = JSON.parse(responseText);
    } catch (parseError) {
      console.log('[RECHARGE] ❌ Failed to parse Fapshi response as JSON');
      console.log('[RECHARGE] Error:', parseError);
      throw new Error(`Invalid response from Fapshi: ${responseText.substring(0, 100)}`);
    }

    if (!fapshiResponse.ok) {
      console.log('[RECHARGE] ❌ Fapshi returned error:', fapshiResult);
      await Transaction.findByIdAndUpdate(transactionId, { status: 'Failed' });
      throw new Error(fapshiResult.message || `Fapshi API error: ${fapshiResponse.status}`);
    }

    console.log('[RECHARGE] ✅ Fapshi accepted request');
    const fapshiTransactionId = fapshiResult.transId;
    console.log('[RECHARGE] Fapshi transId:', fapshiTransactionId);

    // 6. Update transaction
    console.log('[RECHARGE] Step 6: Updating transaction with Fapshi ID...');
    await Transaction.findByIdAndUpdate(transactionId, {
      fapshiTransactionId: fapshiTransactionId,
    });
    console.log('[RECHARGE] ✅ Transaction updated');

    // 7. Return success
    console.log('[RECHARGE] ===== SUCCESS =====');
    return NextResponse.json(
      {
        success: true,
        message: 'Demande de rechargement initiée. Veuillez valider sur votre téléphone.',
        transId: fapshiTransactionId,
        transactionId: transactionId,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[RECHARGE] ❌ FATAL ERROR:', error);
    console.error('[RECHARGE] Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('[RECHARGE] Error message:', error instanceof Error ? error.message : error);
    console.error('[RECHARGE] Error stack:', error instanceof Error ? error.stack : 'N/A');

    if (error instanceof z.ZodError) {
      console.error('[RECHARGE] Zod validation error:', error.issues);
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