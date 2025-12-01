import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db/mongoose-connection';
import Passenger from '@/lib/db/models/Passenger';
import { createCookieServerClient } from '@/lib/db/supabase-server';

/**
 * File: /app/api/auth/login/route.ts (PASSENGER APP)
 * Purpose: Complete login after OTP verification
 * 
 * ✅ CRITICAL FIX: Proper phone number handling
 * - Supabase (OTP) needs: +237XXXXXXXXX (international format)
 * - MongoDB/Fapshi needs: 6XXXXXXXX (local format, no +237)
 * 
 * Flow:
 * 1. User verifies OTP on /verify-otp page
 * 2. OTP verification creates Supabase session
 * 3. This route is called to finalize login
 * 4. Returns success and user data
 */

/**
 * Format phone for Supabase (needs +237 prefix)
 */
function formatPhoneForSupabase(phone: string): string {
  // Remove all spaces and special characters
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // If already has +237, return as is
  if (cleaned.startsWith('+237')) {
    return cleaned;
  }
  
  // If starts with 237, add +
  if (cleaned.startsWith('237')) {
    return `+${cleaned}`;
  }
  
  // If starts with 6-8 (valid Cameroon mobile), add +237
  if (/^[6-8]\d{8}$/.test(cleaned)) {
    return `+237${cleaned}`;
  }
  
  // Otherwise add +237
  return `+237${cleaned}`;
}

/**
 * Clean phone for MongoDB/Fapshi (just 9 digits, no prefix)
 */
function cleanPhoneForStorage(phone: string): string {
  // Remove all non-digits
  let cleaned = phone.replace(/\D/g, '');
  
  // If has 237 prefix, remove it
  if (cleaned.startsWith('237')) {
    cleaned = cleaned.substring(3);
  }
  
  // Should be 9 digits starting with 6/7/8
  if (/^[6-8]\d{8}$/.test(cleaned)) {
    return cleaned;
  }
  
  throw new Error('Invalid Cameroon phone number format');
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();

  try {
    console.log('[LOGIN] Starting login process...');
    
    // 1. Check if user is authenticated (should have session from OTP verification)
    const supabase = createCookieServerClient(cookieStore);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      console.log('[LOGIN] ❌ No session found');
      return NextResponse.json(
        { error: 'Non authentifié. Veuillez vérifier votre OTP.' },
        { status: 401 }
      );
    }

    console.log('[LOGIN] Session found for user:', session.user.id);

    // 2. Connect to MongoDB
    await dbConnect();
    console.log('[LOGIN] ✅ Database connected');

    // 3. Get passenger data
    const passenger = await Passenger.findOne({ authId: session.user.id });

    if (!passenger) {
      console.log('[LOGIN] ❌ Passenger not found for authId:', session.user.id);
      return NextResponse.json(
        { error: 'Passager non trouvé' },
        { status: 404 }
      );
    }

    console.log('[LOGIN] ✅ Passenger found:', passenger.phoneNumber);
    console.log('[LOGIN] Phone format in MongoDB:', passenger.phoneNumber);
    console.log('[LOGIN] ✅ Login successful for:', passenger.phoneNumber);
    console.log('='.repeat(80));

    // 4. Return success with user data
    return NextResponse.json(
      {
        success: true,
        message: 'Connexion réussie',
        user: {
          id: passenger._id,
          firstName: passenger.firstName,
          lastName: passenger.lastName,
          phoneNumber: passenger.phoneNumber, // Returns storage format (6XXXXXXXX)
          wallet: passenger.wallet,
        },
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[LOGIN] ❌ Critical Error:', error);

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
    console.log('[LOGIN CHECK] Checking authentication status...');
    
    const supabase = createCookieServerClient(cookieStore);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      console.log('[LOGIN CHECK] No active session');
      return NextResponse.json(
        { authenticated: false },
        { status: 200 }
      );
    }

    console.log('[LOGIN CHECK] Session found for user:', session.user.id);

    await dbConnect();
    const passenger = await Passenger.findOne({ authId: session.user.id });

    if (!passenger) {
      console.log('[LOGIN CHECK] ⚠️ Session exists but no passenger record found');
      return NextResponse.json(
        { authenticated: false },
        { status: 200 }
      );
    }

    console.log('[LOGIN CHECK] ✅ Authenticated passenger:', passenger.phoneNumber);

    return NextResponse.json(
      {
        authenticated: true,
        user: {
          id: passenger._id,
          firstName: passenger.firstName,
          lastName: passenger.lastName,
          phoneNumber: passenger.phoneNumber, // Returns storage format (6XXXXXXXX)
          wallet: passenger.wallet,
        },
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[LOGIN CHECK] ❌ Error:', error);
    return NextResponse.json(
      { authenticated: false },
      { status: 500 }
    );
  }
}