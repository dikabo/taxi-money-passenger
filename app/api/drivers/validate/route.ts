import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongoose-connection';
import mongoose from 'mongoose';

/**
 * File: /app/api/driver/validate/route.ts (PASSENGER APP)
 * Purpose: Validate driver exists by ID
 * 
 * GET /api/driver/validate?id=DRIVER_ID
 */

// Define minimal Driver schema inline (read-only)
// This avoids importing from driver app
const DriverSchema = new mongoose.Schema({
  authId: String,
  firstName: String,
  lastName: String,
  phoneNumber: String,
  vehicleType: String,
  vehicleColor: String,
  vehicleMake: String,
  vehicleModel: String,
}, { collection: 'drivers' }); // Explicitly set collection name

// Get or create model (handles hot-reload in development)
const Driver = mongoose.models.Driver || mongoose.model('Driver', DriverSchema);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const driverId = searchParams.get('id');

    if (!driverId) {
      return NextResponse.json(
        { error: 'ID du chauffeur requis' },
        { status: 400 }
      );
    }

    console.log('[VALIDATE DRIVER] Looking for driver:', driverId);

    await dbConnect();

    // Find driver by multiple possible ID fields
    const driver = await Driver.findOne({ 
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(driverId) ? driverId : null },
        { authId: driverId },
        { phoneNumber: driverId },
      ]
    }).lean();

    if (!driver) {
      console.log('[VALIDATE DRIVER] Driver not found:', driverId);
      return NextResponse.json(
        { error: 'Chauffeur non trouvé' },
        { status: 404 }
      );
    }

    console.log('[VALIDATE DRIVER] ✅ Driver found:', driverId);

    // Return driver info for payment confirmation
    return NextResponse.json({
      success: true,
      driver: {
        id: driverId?.toString() || '',
      },
    });

  } catch (error) {
    console.error('[VALIDATE DRIVER] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue';
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: 'Impossible de valider le chauffeur'
      },
      { status: 500 }
    );
  }
}