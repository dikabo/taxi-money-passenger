import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { rechargeSchema } from '@/lib/validations/passenger-auth';
import { createCookieServerClient } from '@/lib/db/supabase-server';
import dbConnect from '@/lib/db/mongoose-connection';
import Passenger from '@/lib/db/models/Passenger';
import Transaction, { ITransaction } from '@/lib/db/models/Transaction';

/**
 * CRITICAL FIX: Auto-detect Fapshi environment from API key
 * FAK_test_... → Use sandbox.fapshi.com
 * FAK_live_... → Use live.fapshi.com (or api.fapshi.com)
 */

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();

  try {
    console.log('[RECHARGE] ===== REQUEST START =====');

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

    const phoneWithoutPrefix = rechargePhoneNumber.replace(/^\+237/, '');

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

    // 4. Create Transaction
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

    // 5. Call Fapshi
    const fapshiApiKey = process.env.FAPSHI_API_KEY;
    const fapshiApiUser = process.env.FAPSHI_API_USER;

    if (!fapshiApiKey || !fapshiApiUser) {
      throw new Error('FAPSHI_API_KEY and FAPSHI_API_USER must be configured');
    }

    // CRITICAL: Auto-detect environment from API key
    const isSandbox = fapshiApiKey.includes('test') || fapshiApiKey.includes('TEST');
    const fapshiBaseUrl = isSandbox 
      ? 'https://sandbox.fapshi.com'
      : 'https://live.fapshi.com';

    const fapshiEndpoint = `${fapshiBaseUrl}/direct-pay`;

    console.log('[RECHARGE] Fapshi Environment:', isSandbox ? 'SANDBOX' : 'LIVE');
    console.log('[RECHARGE] Fapshi Endpoint:', fapshiEndpoint);
    console.log('[RECHARGE] API Key starts with:', fapshiApiKey.substring(0, 15) + '...');

    const requestBody = {
      amount: amountAsNumber,
      phone: phoneWithoutPrefix,
      medium: paymentMedium,
      externalId: externalId,
      userId: passengerId,
      message: 'Wallet recharge for transportation service',
    };

    console.log('[RECHARGE] Request body:', JSON.stringify(requestBody));

    const fapshiResponse = await fetch(fapshiEndpoint, {
      method: 'POST',
      headers: {
        'apikey': fapshiApiKey,
        'apiuser': fapshiApiUser,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('[RECHARGE] Fapshi response status:', fapshiResponse.status);

    const responseText = await fapshiResponse.text();
    console.log('[RECHARGE] Fapshi raw response:', responseText.substring(0, 500));

    let fapshiResult;
    try {
      fapshiResult = JSON.parse(responseText);
    } catch (parseError) {
      console.log('[RECHARGE] ❌ Failed to parse Fapshi response as JSON');
      throw new Error(`Invalid response from Fapshi: ${responseText.substring(0, 100)}`);
    }

    if (!fapshiResponse.ok) {
      console.log('[RECHARGE] ❌ Fapshi error:', fapshiResult);
      await Transaction.findByIdAndUpdate(transactionId, { status: 'Failed' });
      throw new Error(fapshiResult.message || `Fapshi error: ${fapshiResponse.status}`);
    }

    const fapshiTransactionId = fapshiResult.transId;

    await Transaction.findByIdAndUpdate(transactionId, {
      fapshiTransactionId: fapshiTransactionId,
    });

    console.log('[RECHARGE] ✅ SUCCESS - Fapshi transId:', fapshiTransactionId);

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
    console.error('[RECHARGE] ❌ ERROR:', error);

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