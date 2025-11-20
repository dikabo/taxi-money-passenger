import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createCookieServerClient } from '@/lib/db/supabase-server';
import dbConnect from '@/lib/db/mongoose-connection';
import Passenger from '@/lib/db/models/Passenger';
import Transaction from '@/lib/db/models/Transaction';

/**
 * File: /app/api/transactions/history/route.ts
 * Purpose: Get passenger transaction history
 * 
 * GET /api/transactions/history
 * Returns all transactions for authenticated passenger
 */

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();

  try {
    // 1. Check authentication
    const supabase = createCookieServerClient(cookieStore);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // 2. Connect to database
    await dbConnect();

    // 3. Find passenger
    const passenger = await Passenger.findOne({ authId: session.user.id });
    
    if (!passenger) {
      return NextResponse.json(
        { error: 'Passager non trouvé' },
        { status: 404 }
      );
    }

    // 4. Get all transactions for this passenger
    const transactions = await Transaction.find({
      userId: passenger._id,
    })
      .sort({ createdAt: -1 }) // Most recent first
      .limit(50) // Limit to last 50 transactions
      .lean()
      .exec();

    // 5. Return transactions
    return NextResponse.json({
      success: true,
      transactions,
      count: transactions.length,
    });

  } catch (error) {
    console.error('[TRANSACTIONS HISTORY] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Une erreur est survenue',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}