import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/db/mongoose-connection';
import Passenger from '@/lib/db/models/Passenger';

/**
 * File: /app/api/auth/check-phone/route.ts
 * Purpose: Check if a phone number exists in the system
 * Used during login to verify the user is registered
 */

const cameroonPhoneRegex = /^\+237[6-8]\d{8}$/;

const checkPhoneSchema = z.object({
  phoneNumber: z.string().regex(cameroonPhoneRegex, {
    message: 'Le numéro doit être au format +237XXXXXXXXX',
  }),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Validate Body
    const body = await req.json();
    const validation = checkPhoneSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Numéro de téléphone invalide', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { phoneNumber } = validation.data;

    console.log('[CHECK PHONE] Checking phone:', phoneNumber);

    // 2. Connect to MongoDB
    await dbConnect();

    // 3. Check if passenger exists
    const passenger = await Passenger.findOne({ phoneNumber }).lean();

    if (!passenger) {
      console.log('[CHECK PHONE] Phone not found:', phoneNumber);
      return NextResponse.json(
        { error: 'Ce numéro n\'est pas enregistré. Veuillez créer un compte.' },
        { status: 404 }
      );
    }

    console.log('[CHECK PHONE] ✅ Phone found for passenger:', passenger._id);

    // 4. Return success (don't send sensitive data)
    return NextResponse.json(
      {
        success: true,
        message: 'Numéro trouvé',
        firstName: passenger.firstName, // Optional: for personalized message
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[CHECK PHONE API] Error:', error);

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