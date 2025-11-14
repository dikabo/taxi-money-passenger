'use client';

import { Suspense } from 'react';
import { PassengerOtpForm } from '@/components/forms/PassengerOtpForm';

/**
 * Fichier: /app/(auth)/verify-otp/page.tsx
 * Objectif: Affiche le formulaire de vérification OTP du passager.
 */

export default function VerifyOtpPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-white mb-2">Vérifiez votre téléphone</h1>
        <p className="text-gray-400 text-center mb-6">
          Nous avons envoyé un code de vérification à 6 chiffres.
        </p>
        <Suspense fallback={<div className="text-white">Chargement...</div>}>
          <PassengerOtpForm />
        </Suspense>
      </div>
    </div>
  );
}