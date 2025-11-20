import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db/mongoose-connection';
import Passenger from '@/lib/db/models/Passenger';
import { createCookieServerClient } from '@/lib/db/supabase-server';

/**
 * File: /app/api/auth/login/route.ts
 * Purpose: Complete login after OTP verification
 * ✅ UPDATED: This route is now called AFTER OTP verification
 * 
 * Flow:
 * 1. User verifies OTP on /verify-otp page
 * 2. OTP verification creates Supabase session
 * 3. This route is called to finalize login
 * 4. Returns success and user data
 */

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();

  try {
    // 1. Check if user is authenticated (should have session from OTP verification)
    const supabase = createCookieServerClient(cookieStore);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié. Veuillez vérifier votre OTP.' },
        { status: 401 }
      );
    }

    // 2. Connect to MongoDB
    await dbConnect();

    // 3. Get passenger data
    const passenger = await Passenger.findOne({ authId: session.user.id });

    if (!passenger) {
      return NextResponse.json(
        { error: 'Passager non trouvé' },
        { status: 404 }
      );
    }

    console.log('[LOGIN] ✅ Login successful for:', passenger.phoneNumber);

    // 4. Return success with user data
    return NextResponse.json(
      {
        success: true,
        message: 'Connexion réussie',
        user: {
          id: passenger._id,
          firstName: passenger.firstName,
          lastName: passenger.lastName,
          phoneNumber: passenger.phoneNumber,
          wallet: passenger.wallet,
        },
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[LOGIN API] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Une erreur inattendue est survenue';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check login status
 */
export async function GET(req: NextRequest) {
  const cookieStore = await cookies();

  try {
    const supabase = createCookieServerClient(cookieStore);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { authenticated: false },
        { status: 200 }
      );
    }

    await dbConnect();
    const passenger = await Passenger.findOne({ authId: session.user.id });

    return NextResponse.json(
      {
        authenticated: true,
        user: passenger ? {
          id: passenger._id,
          firstName: passenger.firstName,
          lastName: passenger.lastName,
          wallet: passenger.wallet,
        } : null,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[LOGIN CHECK] Error:', error);
    return NextResponse.json(
      { authenticated: false },
      { status: 500 }
    );
  }
}