import { z } from 'zod';

/**
 * File: /lib/validations/passenger-auth.ts
 * Purpose: Zod schemas for passenger authentication and payments.
 *
 * FIXED: Recharge schema now properly handles optional phone field
 * until method is selected (conditional rendering).
 */

const cameroonPhoneRegex = /^\+237[6-8]\d{8}$/;
const pinRegex = /^\d{4}$/;
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// ✅ FIXED: Define numericString helper (reusable for all numeric string fields)
const numericString = z
  .string()
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

// ✅ FIXED: Recharge schema with conditional phone validation
// Phone is optional until method is selected, then required
export const rechargeSchema = z.object({
  amount: numericString
    .min(1, 'Veuillez entrer un montant.')
    .refine((val) => Number(val) >= 100, {
      message: 'Le rechargement minimum est de 100 XAF',
    })
    .refine((val) => Number(val) <= 5000, {
      message: 'Le rechargement maximum est de 5,000 XAF',
    }),
  method: z.string().min(1, 'Veuillez choisir une méthode.'),
  
  // ✅ FIXED: Phone number is optional (allows empty string) but when provided must match regex
  rechargePhoneNumber: z
    .string()
    .optional()
    .refine(
      (val) => !val || cameroonPhoneRegex.test(val),
      'Veuillez saisir un numéro MoMo valide (+237...)'
    ),
}).refine(
  // ✅ ADDED: Refinement to ensure phone is provided when method is selected
  (data) => {
    if (data.method && !data.rechargePhoneNumber) {
      return false;
    }
    return true;
  },
  {
    message: 'Veuillez entrer un numéro de téléphone MoMo',
    path: ['rechargePhoneNumber'],
  }
);

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

// ✅ TYPE EXPORTS
export type RechargeFormValues = z.infer<typeof rechargeSchema>;
export type PayDriverFormValues = z.infer<typeof payDriverSchema>;
export type PassengerSignupValues = z.infer<typeof passengerSignupSchema>;
export type PassengerOtpValues = z.infer<typeof passengerOtpSchema>;
export type PinLoginValues = z.infer<typeof pinLoginSchema>;