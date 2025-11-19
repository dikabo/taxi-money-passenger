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
      return NextResponse.json(
        { error: 'Fapshi credentials not configured on server' },
        { status: 500 }
      );
    }

    // Auto-detect environment
    const isSandbox = fapshiApiKey.includes('test') || fapshiApiKey.includes('TEST');
    const fapshiBaseUrl = isSandbox 
      ? 'https://sandbox.fapshi.com'
      : 'https://live.fapshi.com';

    const fapshiEndpoint = `${fapshiBaseUrl}/direct-pay`;

    const requestBody = {
      amount: amountAsNumber,
      phone: phoneWithoutPrefix,
      medium: paymentMedium,
      externalId: externalId,
      userId: passengerId,
      message: 'Wallet recharge for transportation service',
    };

    const fapshiResponse = await fetch(fapshiEndpoint, {
      method: 'POST',
      headers: {
        'apikey': fapshiApiKey,
        'apiuser': fapshiApiUser,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await fapshiResponse.text();

    let fapshiResult;
    try {
      fapshiResult = JSON.parse(responseText);
    } catch (parseError) {
      // Return detailed error for debugging
      return NextResponse.json(
        { 
          error: 'Invalid response from Fapshi',
          details: responseText.substring(0, 200),
          status: fapshiResponse.status,
        },
        { status: 500 }
      );
    }

    if (!fapshiResponse.ok) {
      await Transaction.findByIdAndUpdate(transactionId, { status: 'Failed' });
      return NextResponse.json(
        { 
          error: fapshiResult.message || 'Fapshi API error',
          details: fapshiResult,
          httpStatus: fapshiResponse.status,
        },
        { status: 400 }
      );
    }

    const fapshiTransactionId = fapshiResult.transId;

    await Transaction.findByIdAndUpdate(transactionId, {
      fapshiTransactionId: fapshiTransactionId,
    });

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
    // Return detailed error for debugging in production
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorName = error instanceof Error ? error.constructor.name : typeof error;
    
    return NextResponse.json(
      { 
        error: errorMessage,
        type: errorName,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}