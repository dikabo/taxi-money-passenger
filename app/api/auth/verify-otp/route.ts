import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { passengerOtpSchema } from '@/lib/validations/passenger-auth';
import { createCookieServerClient } from '@/lib/db/supabase-server';

/**
 * File: /app/api/auth/verify-otp/route.ts (PASSENGER APP)
 * Purpose: API to verify the passenger's OTP.
 * ✅ FIXED: Properly formats phone for Supabase verification
 */

/**
 * Format phone for Supabase (needs +237 prefix)
 */
function formatPhoneForSupabase(phone: string): string {
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  if (cleaned.startsWith('+237')) {
    return cleaned;
  }
  
  if (cleaned.startsWith('237')) {
    return `+${cleaned}`;
  }
  
  if (/^[6-8]\d{8}$/.test(cleaned)) {
    return `+237${cleaned}`;
  }
  
  return `+237${cleaned}`;
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();

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

    // ✅ Format phone for Supabase verification
    const supabasePhone = formatPhoneForSupabase(phoneNumber);
    
    console.log('[VERIFY-OTP] Original phone:', phoneNumber);
    console.log('[VERIFY-OTP] Formatted phone:', supabasePhone);
    console.log('[VERIFY-OTP] Token:', token);

    // 3. Verify the OTP with Supabase
    const {
      data: { session },
      error: otpError,
    } = await supabase.auth.verifyOtp({
      phone: supabasePhone, // Must match the format used when sending OTP
      token: token,
      type: 'sms',
    });

    if (otpError) {
      console.error('[VERIFY-OTP] ❌ Verification error:', otpError);
      return NextResponse.json(
        { error: `OTP invalide ou expiré. Veuillez réessayer.` },
        { status: 400 }
      );
    }

    if (!session) {
      console.error('[VERIFY-OTP] ❌ No session returned');
      return NextResponse.json(
        { error: 'Verification failed: No session returned.' },
        { status: 500 }
      );
    }

    console.log('[VERIFY-OTP] ✅ Phone verified successfully');
    console.log('[VERIFY-OTP] Session user:', session.user.id);

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
    console.error('[VERIFY-OTP] ❌ Critical error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}