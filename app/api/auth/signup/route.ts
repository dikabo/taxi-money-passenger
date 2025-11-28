import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db/mongoose-connection';
import Passenger from '@/lib/db/models/Passenger';
import { passengerSignupSchema } from '@/lib/validations/passenger-auth';
import { 
  createAdminServerClient, 
  createCookieServerClient 
} from '@/lib/db/supabase-server';
import { z } from 'zod';

/**
 * File: /app/api/auth/signup/route.ts (PASSENGER APP)
 * Purpose: API endpoint for new PASSENGER registration.
 * ✅ FIXED: Now uses signInWithOtp to send real SMS
 */

interface MongoError {
  code: number;
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();

  try {
    // 1. Initialize Admin client (to create user)
    const supabaseAdmin = createAdminServerClient(cookieStore);

    // 2. Validate Body
    const body = await req.json();
    const validation = passengerSignupSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid data.', details: validation.error.issues },
        { status: 400 }
      );
    }

    const {
      phoneNumber,
      password,
      email,
      pin,
      ...passengerData
    } = validation.data;

    console.log('[SIGNUP] Attempting signup for phone:', phoneNumber);

    // 3. Connect to Database
    await dbConnect();

    // 4. Check for existing passenger
    const existingPassenger = await Passenger.findOne({ phoneNumber });

    if (existingPassenger) {
      return NextResponse.json(
        { error: 'Un utilisateur avec ce numéro de téléphone existe déjà.' }, 
        { status: 409 }
      );
    }

    // 5. Create Auth User in Supabase (with Admin Client)
    console.log('[SIGNUP] Creating Supabase user...');
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        phone: phoneNumber,
        password: password,
        email: email,
        phone_confirm: false, // User must verify via OTP
        email_confirm: !!email,
      });

    if (authError) {
      console.error('[SIGNUP] Supabase Auth Error:', authError);
      throw new Error(`Supabase Auth Error: ${authError.message}`);
    }
    if (!authData.user) {
      throw new Error('Supabase did not return a user.');
    }

    console.log('[SIGNUP] Supabase user created:', authData.user.id);

    // 6. Create Passenger profile in MongoDB
    const newPassenger = new Passenger({
      ...passengerData,
      authId: authData.user.id,
      phoneNumber,
      email: email,
      pin: pin, // Will be auto-hashed by Mongoose middleware
    });

    await newPassenger.save();
    console.log('[SIGNUP] MongoDB passenger created');

    // 7. ✅ CRITICAL FIX: Send OTP using signInWithOtp (not signInWithPassword!)
    // Test numbers (688888888) use Supabase Phone Autofill with OTP: 123456
    // Real numbers will receive SMS
    
    console.log('[SIGNUP] Sending OTP...');
    const supabaseCookieClient = createCookieServerClient(cookieStore);
    
    const { error: otpError } = await supabaseCookieClient.auth.signInWithOtp({
      phone: phoneNumber,
      options: {
        // Don't create a new user - we already created one with admin client
        shouldCreateUser: false,
      },
    });

    if (otpError) {
      console.error('[SIGNUP] OTP send failed:', otpError);
      // User is created, but OTP failed - this is recoverable
      // They can try to login again to get a new OTP
      return NextResponse.json(
        { 
          error: `Compte créé mais échec de l'envoi du code OTP: ${otpError.message}`,
          userId: authData.user.id,
          canRetry: true,
        },
        { status: 500 }
      );
    }

    console.log('[SIGNUP] ✅ OTP sent successfully');

    // 8. Success
    return NextResponse.json(
      {
        success: true,
        message: 'Passenger registered. Please verify your phone.',
        userId: authData.user.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[SIGNUP] ❌ Critical Error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid validation', details: error.issues },
        { status: 400 }
      );
    }
    if ((error as MongoError).code === 11000) {
      return NextResponse.json(
        { error: 'A duplicate account exists.' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: (error as Error).message || 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}