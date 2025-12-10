import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongoose-connection';
import mongoose from 'mongoose';

/**
 * File: /app/api/drivers/info/route.ts (PASSENGER APP)
 * Purpose: Get driver information by ID
 * 
 * POST /api/drivers/info
 * Body: { driverId: string }
 * Returns: Driver name and basic info
 */

// Define minimal Driver schema inline (read-only)
// This avoids importing from driver app
const DriverSchema = new mongoose.Schema({
  authId: String,
  firstName: String,
  lastName: String,
  phoneNumber: String,
  email: String,
  vehicleType: String,
  vehicleColor: String,
  vehicleMake: String,
  vehicleModel: String,
  immatriculation: String,
  availableBalance: Number,
}, { collection: 'drivers' }); // Explicitly set collection name

// Get or create model (handles hot-reload in development)
const Driver = mongoose.models.Driver || mongoose.model('Driver', DriverSchema);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { driverId } = body;

    if (!driverId) {
      return NextResponse.json(
        { error: 'Driver ID requis' },
        { status: 400 }
      );
    }

    console.log('[DRIVER INFO] Looking up driver with ID prefix:', driverId);

    // Connect to database
    await dbConnect();

    // Get all drivers and find one where _id starts with the provided prefix
    const drivers = await Driver.find({}).lean().exec();
    
    // Type for driver document
    interface DriverDoc {
      _id: mongoose.Types.ObjectId;
      firstName: string;
      lastName: string;
      vehicleType: string;
      vehicleColor: string;
      vehicleMake: string;
      vehicleModel: string;
      immatriculation: string;
    }
    
    const driver = drivers.find((d) => {
      const fullId = String(d._id);
      const shortId = fullId.substring(0, 8).toUpperCase();
      return shortId === driverId.toUpperCase();
    }) as DriverDoc | undefined;

    if (!driver) {
      console.log('[DRIVER INFO] ❌ Driver not found for ID:', driverId);
      return NextResponse.json(
        { error: 'Chauffeur non trouvé. Vérifiez l\'ID.' },
        { status: 404 }
      );
    }

    console.log('[DRIVER INFO] ✅ Driver found:', driver.firstName, driver.lastName);

    // Return driver info (only public data)
    return NextResponse.json({
      success: true,
      driver: {
        id: String(driver._id).substring(0, 8).toUpperCase(),
        fullId: String(driver._id),
        name: `${driver.firstName} ${driver.lastName}`,
        firstName: driver.firstName,
        lastName: driver.lastName,
        vehicleType: driver.vehicleType,
        vehicleColor: driver.vehicleColor,
        vehicleMake: driver.vehicleMake,
        vehicleModel: driver.vehicleModel,
        immatriculation: driver.immatriculation,
      },
    });

  } catch (error) {
    console.error('[DRIVER INFO] ❌ Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Une erreur est survenue',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}