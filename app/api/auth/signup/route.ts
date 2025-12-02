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
 * 
 * ✅ CRITICAL FIX: Proper phone number handling
 * - Supabase (OTP) needs: +237XXXXXXXXX (international format)
 * - MongoDB/Fapshi needs: 6XXXXXXXX (local format, no +237)
 * 
 * ✅ NEW FIX: Prevents duplicate Supabase users
 * - Checks if user exists in Supabase FIRST
 * - If exists but not in MongoDB, deletes from Supabase and recreates
 */

interface MongoError {
  code: number;
}

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

/**
 * Clean phone for MongoDB/Fapshi (just 9 digits, no prefix)
 */
function cleanPhoneForStorage(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('237')) {
    cleaned = cleaned.substring(3);
  }
  
  if (/^[6-8]\d{8}$/.test(cleaned)) {
    return cleaned;
  }
  
  throw new Error('Invalid Cameroon phone number format');
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();

  try {
    // 1. Initialize Admin client
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

    console.log('[SIGNUP] Original phone from form:', phoneNumber);

    // ✅ CRITICAL: Format phone differently for different purposes
    const supabasePhone = formatPhoneForSupabase(phoneNumber); // +237XXXXXXXXX for Supabase/Twilio
    const storagePhone = cleanPhoneForStorage(phoneNumber);     // 6XXXXXXXX for MongoDB/Fapshi
    
    console.log('[SIGNUP] Supabase format (for OTP):', supabasePhone);
    console.log('[SIGNUP] Storage format (for MongoDB/Fapshi):', storagePhone);

    // 3. Connect to Database
    await dbConnect();

    // 4. Check for existing passenger (use storage format)
    const existingPassenger = await Passenger.findOne({ phoneNumber: storagePhone });

    if (existingPassenger) {
      return NextResponse.json(
        { error: 'Un utilisateur avec ce numéro de téléphone existe déjà.' }, 
        { status: 409 }
      );
    }

    // ✅ NEW: Check if user exists in Supabase (orphaned user from previous failed signup)
    console.log('[SIGNUP] Checking for existing Supabase user...');
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingSupabaseUser = existingUsers?.users.find(
      (      user: { phone: string; }) => user.phone === supabasePhone
    );

    if (existingSupabaseUser) {
      console.log('[SIGNUP] ⚠️ Found orphaned Supabase user, deleting...', existingSupabaseUser.id);
      
      // Delete the orphaned Supabase user
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
        existingSupabaseUser.id
      );
      
      if (deleteError) {
        console.error('[SIGNUP] ❌ Failed to delete orphaned user:', deleteError);
        return NextResponse.json(
          { error: 'Ce numéro existe déjà. Veuillez contacter le support.' },
          { status: 409 }
        );
      }
      
      console.log('[SIGNUP] ✅ Orphaned user deleted successfully');
    }

    // 5. Create Auth User in Supabase (use Supabase format with +237)
    console.log('[SIGNUP] Creating Supabase user with phone:', supabasePhone);
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        phone: supabasePhone, // +237XXXXXXXXX for Twilio
        password: password,
        email: email || undefined,
        phone_confirm: false,
        email_confirm: !!email,
      });

    if (authError) {
      console.error('[SIGNUP] Supabase Auth Error:', authError);
      throw new Error(`Supabase Auth Error: ${authError.message}`);
    }
    if (!authData.user) {
      throw new Error('Supabase did not return a user.');
    }

    console.log('[SIGNUP] ✅ Supabase user created:', authData.user.id);

    // 6. Create Passenger profile in MongoDB
console.log('[SIGNUP] About to save passenger with:', {
  authId: authData.user.id,
  phoneNumber: storagePhone,
  email: email,
});

try {
  const newPassenger = new Passenger({
    ...passengerData,
    authId: authData.user.id,
    phoneNumber: storagePhone,
    email: email || undefined,
    pin: pin,
  });
  await newPassenger.save();
} catch (mongoError) {
  console.error('[SIGNUP] MongoDB save error:', mongoError);
  // Log the full error to see which field caused the duplicate
  throw mongoError;
}

    // 7. Send OTP using Supabase format
    console.log('[SIGNUP] Sending OTP to:', supabasePhone);
    const supabaseCookieClient = createCookieServerClient(cookieStore);
    
    const { error: otpError } = await supabaseCookieClient.auth.signInWithOtp({
      phone: supabasePhone, // +237XXXXXXXXX for Twilio SMS
      options: {
        shouldCreateUser: false, // User already created
      },
    });

    if (otpError) {
      console.error('[SIGNUP] ❌ OTP send failed:', otpError);
      console.error('[SIGNUP] Phone used:', supabasePhone);
      
      // User is created but OTP failed
      return NextResponse.json(
        { 
          error: `Compte créé mais échec de l'envoi du code OTP: ${otpError.message}. Veuillez réessayer de vous connecter.`,
          userId: authData.user.id,
          canRetry: true,
        },
        { status: 500 }
      );
    }

    console.log('[SIGNUP] ✅ OTP sent successfully');
    console.log('='.repeat(80));

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