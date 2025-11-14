import mongoose, { Document, Model, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * File: /lib/db/models/Passenger.ts
 * Purpose: Defines the Mongoose schema for the Passenger collection.
 */

// Interface for the Passenger document
export interface IPassenger extends Document {
  authId: string; // From Supabase
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string;
  pin: string; // The 4-digit hashed PIN
  walletBalance: number;
  createdAt: Date;
  updatedAt: Date;

  // Method to compare PIN
  comparePin(candidatePin: string): Promise<boolean>;
}

// Mongoose Schema
const PassengerSchema: Schema<IPassenger> = new mongoose.Schema(
  {
    authId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: false,
      unique: true,
      sparse: true, 
      trim: true,
      lowercase: true,
      match: [/.+\@.+\..+/, 'Please enter a valid email address'],
    },
    pin: {
      type: String,
      required: [true, 'A 4-digit PIN is required'],
    },
    walletBalance: {
      type: Number,
      required: true,
      default: 0, // Start with an empty wallet
    },
  },
  {
    timestamps: true,
  }
);

// Middleware to hash the PIN before saving
PassengerSchema.pre<IPassenger>('save', async function (next) {
  if (!this.isModified('pin')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.pin = await bcrypt.hash(this.pin, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Method to compare candidate PIN with hashed PIN
PassengerSchema.methods.comparePin = async function (
  candidatePin: string
): Promise<boolean> {
  return bcrypt.compare(candidatePin, this.pin);
};

// Prevent re-compilation
const Passenger: Model<IPassenger> =
  mongoose.models.Passenger ||
  mongoose.model<IPassenger>('Passenger', PassengerSchema);

export default Passenger;