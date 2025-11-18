import mongoose, { Document, Model, Schema } from 'mongoose';

/**
 * File: /lib/db/models/Transaction.ts
 * Purpose: Defines the Mongoose schema for the Transaction collection.
 * This will be a "shared" collection for all money movement.
 *
 * Transactions track all financial activity:
 * - Recharge: User adds funds via Fapshi
 * - Withdrawal: User withdraws funds via Fapshi
 * - Payment: Passenger pays driver for ride
 * - Charge: Platform charge/fee deduction
 */

export interface ITransaction extends Document {
  userId: mongoose.Schema.Types.ObjectId; // Link to Passenger or Driver
  userType: 'Passenger' | 'Driver';
  type: 'Recharge' | 'Withdrawal' | 'Payment' | 'Charge';
  status: 'Pending' | 'Success' | 'Failed';
  amount: number; // The amount of the transaction (in XAF)
  method: string; // e.g., 'MTN', 'Orange', 'Internal'
  fapshiTransactionId?: string; // The ID from Fapshi API
  externalId?: string; // ✅ ADDED: Our external transaction ID for Fapshi mapping
  phoneNumber: string; // The MoMo number used
  notes?: string; // e.g., "Payment to Driver X"
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema: Schema<ITransaction> = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Passenger', // ✅ CHANGED: 'Driver' → 'Passenger' (for Fapshi recharges)
      index: true,
    },
    userType: {
      type: String,
      required: true,
      enum: ['Passenger', 'Driver'],
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['Recharge', 'Withdrawal', 'Payment', 'Charge'],
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['Pending', 'Success', 'Failed'],
      default: 'Pending',
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [1, 'Amount must be at least 1 XAF'],
      max: [500000, 'Invalid transaction amount'],
    },
    method: {
      type: String,
      required: true,
      enum: ['MTN', 'Orange', 'Internal', 'USSD'],
    },
    fapshiTransactionId: {
      type: String,
      unique: true,
      sparse: true,
      index: true, // Index for webhook lookups
    },
    // ✅ ADDED: externalId to map Fapshi webhook responses
    externalId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      match: [/^\+?[0-9]{7,15}$/, 'Invalid phone number format'],
    },
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries
TransactionSchema.index({ userId: 1, createdAt: -1 }); // User's transaction history
TransactionSchema.index({ status: 1, type: 1 }); // Find pending withdrawals, recharges, etc.
TransactionSchema.index({ userType: 1, status: 1 }); // Driver/Passenger stats
TransactionSchema.index({ externalId: 1 }); // ✅ ADDED: For faster Fapshi webhook lookups

// This ensures we can use the same Transaction model across both apps
const Transaction: Model<ITransaction> =
  mongoose.models.Transaction ||
  mongoose.model<ITransaction>('Transaction', TransactionSchema);

export default Transaction;