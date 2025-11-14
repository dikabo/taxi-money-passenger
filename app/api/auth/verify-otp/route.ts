import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { passengerOtpSchema } from '@/lib/validations/passenger-auth';
import { createCookieServerClient } from '@/lib/db/supabase-server'; 

/**
 * File: /app/api/auth/verify-otp/route.ts
 * Purpose: API to verify the passenger's OTP.
 */

export async function POST(req: NextRequest) {
  const cookieStore = await cookies(); // Called at the top

  try {
    // 1. Initialize Cookie Client
    const supabase = createCookieServerClient(cookieStore); 

    // 2. Validate Body
    const body = await req.json();
    const validation = passengerOtpSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid data.', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { phoneNumber, token } = validation.data;

    // 3. Verify the OTP with Supabase
    const {
      data: { session },
      error: otpError,
    } = await supabase.auth.verifyOtp({
      phone: phoneNumber,
      token: token,
      type: 'sms', // 'sms' is correct
    });

    if (otpError) {
      console.error('Supabase OTP verification error:', otpError);
      // This is a user-facing error, so it's in French
      return NextResponse.json(
        { error: `OTP invalide ou expiré. Veuillez réessayer.` },
        { status: 400 }
      );
    }

    if (!session) {
      return NextResponse.json(
        { error: 'Verification failed: No session returned.' },
        { status: 500 }
      );
    }

    // 4. Success
    return NextResponse.json(
      {
        success: true,
        message: 'Phone number verified.',
        session,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Verify OTP API Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}