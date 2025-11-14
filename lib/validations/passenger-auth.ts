import { z } from 'zod';

/**
 * Fichier: /lib/validations/passenger-auth.ts
 * Objectif: Définit les schémas Zod pour l'authentification des PASSAGERS.
 */

const cameroonPhoneRegex = /^\+237[6-8]\d{8}$/;
const pinRegex = /^\d{4}$/;
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// ✅ NEW: Define numericString helper (reusable for all numeric string fields)
const numericString = z
  .string()
  .transform((val, ctx) => {
    const parsed = Number(val);
    if (isNaN(parsed)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Nombre invalide.',
      });
      return z.NEVER;
    }
    return parsed;
  })
  .transform((val) => val.toString());

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

export const rechargeSchema = z.object({
  amount: numericString
    .refine((val) => Number(val) >= 100, {
      message: 'Le rechargement minimum est de 100 XAF',
    }),
  method: z.string().min(1, 'Veuillez choisir une méthode.'),
});

// ✅ NEW SCHEMA FOR PAYING A DRIVER
export const payDriverSchema = z.object({
  driverId: z.string().min(6, 'L\'ID du chauffeur est invalide.'),
  amount: numericString
    .refine((val) => Number(val) >= 150, {
      message: 'Le paiement minimum est de 150 XAF',
    }),
  pin: z.string().regex(pinRegex, {
    message: 'Votre code PIN doit être composé de 4 chiffres.',
  }),
});

export type RechargeFormValues = z.infer<typeof rechargeSchema>;
export type PayDriverFormValues = z.infer<typeof payDriverSchema>;