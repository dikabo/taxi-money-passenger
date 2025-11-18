import { z } from 'zod';

/**
 * File: /lib/validations/passenger-auth.ts
 * Purpose: Zod schemas for passenger authentication and payments.
 *
 * FIXED: Proper type inference and validation for all fields
 */

const cameroonPhoneRegex = /^\+237[6-8]\d{8}$/;
const pinRegex = /^\d{4}$/;
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// ✅ FIXED: Define numericString helper (reusable for all numeric string fields)
const numericString = z
  .string()
  .trim()
  .regex(/^\d+$/, 'Doit être un nombre valide');

export const passengerSignupSchema = z.object({
  firstName: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
  lastName: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  phoneNumber: z.string().regex(cameroonPhoneRegex, {
    message: 'Le numéro doit être au format +237XXXXXXXXX',
  }),
  password: z.string().regex(passwordRegex, {
    message: '8+ caractères, avec lettre, chiffre et symbole.',
  }),
  pin: z.string().regex(pinRegex, {
    message: 'Votre code PIN doit être composé de 4 chiffres.',
  }),
  email: z
    .string()
    .email('Veuillez saisir une adresse e-mail valide')
    .optional()
    .or(z.literal('')),
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: 'Vous devez accepter les conditions générales.',
  }),
  privacyAccepted: z.boolean().refine((val) => val === true, {
    message: 'Vous devez accepter la politique de confidentialité.',
  }),
});

export const passengerOtpSchema = z.object({
  phoneNumber: z.string().regex(cameroonPhoneRegex, {
    message: 'Le numéro doit être au format +237XXXXXXXXX',
  }),
  token: z
    .string()
    .min(6, 'Le code OTP doit être de 6 chiffres')
    .max(6, 'Le code OTP doit être de 6 chiffres'),
});

export const pinLoginSchema = z.object({
  pin: z.string().regex(pinRegex, {
    message: 'Votre code PIN doit être composé de 4 chiffres.',
  }),
});

// ✅ FIXED: Recharge schema with proper validation
// All fields are required and have explicit types
// This ensures type safety in RechargeForm and backend
export const rechargeSchema = z.object({
  amount: numericString
    .min(1, 'Veuillez entrer un montant.')
    .refine((val) => Number(val) >= 100, {
      message: 'Le rechargement minimum est de 100 XAF',
    })
    .refine((val) => Number(val) <= 5000, {
      message: 'Le rechargement maximum est de 5,000 XAF',
    }),
  method: z.enum(['MTN', 'Orange'] as const, {
    message: 'Veuillez choisir une méthode valide (MTN ou Orange).',
  }),
  rechargePhoneNumber: z
    .string()
    .min(1, 'Veuillez entrer un numéro de téléphone')
    .regex(cameroonPhoneRegex, 'Veuillez saisir un numéro MoMo valide (+237...)'),
});

// ✅ NEW SCHEMA FOR PAYING A DRIVER (with Fapshi support)
export const payDriverSchema = z.object({
  driverId: z.string().min(6, 'L\'ID du chauffeur est invalide.'),
  amount: numericString
    .min(1, 'Veuillez entrer un montant.')
    .refine((val) => Number(val) >= 150, {
      message: 'Le paiement minimum est de 150 XAF',
    }),
  pin: z.string().regex(pinRegex, {
    message: 'Votre code PIN doit être composé de 4 chiffres.',
  }),
});

// ✅ TYPE EXPORTS - These are inferred from schemas for type safety
export type RechargeFormValues = z.infer<typeof rechargeSchema>;
export type PayDriverFormValues = z.infer<typeof payDriverSchema>;
export type PassengerSignupValues = z.infer<typeof passengerSignupSchema>;
export type PassengerOtpValues = z.infer<typeof passengerOtpSchema>;
export type PinLoginValues = z.infer<typeof pinLoginSchema>;