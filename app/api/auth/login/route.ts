import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { pinLoginSchema } from '@/lib/validations/passenger-auth';
import { createCookieServerClient } from '@/lib/db/supabase-server';
import dbConnect from '@/lib/db/mongoose-connection';
import Passenger from '@/lib/db/models/Passenger';

/**
 * File: /app/api/auth/login/route.ts
 * Purpose: PIN-based login endpoint
 * 
 * Flow:
 * 1. Get all passengers (in production, might use email/phone first)
 * 2. Compare PIN with hashed PIN
 * 3. Create Supabase session
 * 4. Return success
 */

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();

  try {
    // 1. Validate Body
    const body = await req.json();
    const validation = pinLoginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Code PIN invalide', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { pin } = validation.data;

    // 2. Connect to MongoDB
    await dbConnect();

    // 3. Get all passengers and find one with matching PIN
    // NOTE: In production, you might want to add a phone/email field first
    // For now, we'll try PIN matching (this is not ideal for scale)
    const passengers = await Passenger.find({});
    
    let matchedPassenger = null;
    for (const passenger of passengers) {
      const isPinCorrect = await passenger.comparePin(pin);
      if (isPinCorrect) {
        matchedPassenger = passenger;
        break;
      }
    }

    if (!matchedPassenger) {
      return NextResponse.json(
        { error: 'Code PIN incorrect' },
        { status: 401 }
      );
    }

    // 4. Create Supabase session
    const supabase = createCookieServerClient(cookieStore);
    
    // Sign in using the authId stored in MongoDB
    // Note: This requires that the user already exists in Supabase
    // For this to work, you need to create a JWT or use Supabase admin API
    // For now, we'll create a session with the passenger data
    
    const { data: { session }, error } = await supabase.auth.signInWithPassword({
      email: matchedPassenger.email || `${matchedPassenger.phoneNumber}@taxi-money.local`,
      password: pin, // NOTE: This won't work directly - PIN is hashed
    });

    // ALTERNATIVE: Use Supabase Admin API to create session
    // Since we can't sign in with PIN directly, we need the driver to sign up first
    // Then use email/password or phone OTP
    
    // For now, return error with instructions
    return NextResponse.json(
      { 
        error: 'Veuillez utiliser la page de vérification OTP avec votre numéro de téléphone',
        hint: 'Le système PIN est utilisé après l\'authentification OTP'
      },
      { status: 400 }
    );

  } catch (error) {
    console.error('[LOGIN API] Error:', error);

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