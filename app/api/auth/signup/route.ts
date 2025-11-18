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
 * File: /app/api/auth/signup/route.ts
 * Purpose: API endpoint for new PASSENGER registration.
 * (Backend comments and errors are now in English)
 */

interface MongoError {
  code: number;
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies(); // Called at the top, as corrected

  try {
    // 1. Initialize Admin client (to create user)
    const supabaseAdmin = createAdminServerClient(cookieStore); 

    // 2. Validate Body
    const body = await req.json();
    const validation = passengerSignupSchema.safeParse(body);

    if (!validation.success) {
      // This is a backend error, so it's in English
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
      ...passengerData // firstName, lastName
    } = validation.data;

    // 3. Connect to Database
    await dbConnect();

    // 4. Check for existing passenger
    const existingPassenger = await Passenger.findOne({ phoneNumber });

    if (existingPassenger) {
      // This error *is* shown to the user, so it's in French
      return NextResponse.json(
        { error: 'Un utilisateur avec ce numéro de téléphone existe déjà.' }, 
        { status: 409 }
      );
    }

    // 5. Create Auth User in Supabase (with Admin Client)
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        phone: phoneNumber,
        password: password,
        email: email,
        phone_confirm: false, 
        email_confirm: !!email,
      });

    if (authError) {
      throw new Error(`Supabase Auth Error: ${authError.message}`);
    }
    if (!authData.user) {
      throw new Error('Supabase did not return a user.');
    }

    // 6. Create Passenger profile in MongoDB
    // The 'pin' will be auto-hashed by the Mongoose middleware
    const newPassenger = new Passenger({
      ...passengerData,
      authId: authData.user.id,
      phoneNumber,
      email: email,
      pin: pin, // Sending the 4-digit PIN
    });

    await newPassenger.save();

    // 7. Send OTP (by logging in with the Cookie Client)
    // This is our test harness using the test number
    if (phoneNumber !== '+237688888888') {
      const supabaseCookieClient = createCookieServerClient(cookieStore);
      const { error: otpError } = await supabaseCookieClient.auth.signInWithPassword({
        phone: phoneNumber,
        password: password,
      });

      if (otpError) {
        throw new Error(`User created, but OTP send failed: ${otpError.message}`);
      }
    } else {
      console.log('Test user. Skipping real SMS send.');
    }

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
    console.error('Passenger Signup API Error:', error);
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