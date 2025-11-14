import { PassengerSignupForm } from '@/components/forms/PassengerSignupForm';
import { Metadata } from 'next';

/**
 * Fichier: /app/(auth)/signup/page.tsx
 * Objectif: Affiche le formulaire d'inscription du passager.
 */

export const metadata: Metadata = {
  title: 'Créer un compte | Taxi Money',
  description: 'Créez votre compte passager Taxi Money.',
};

export default function SignupPage() {
  return (
    <div>
      <h2 className="text-3xl font-bold text-center text-white mb-6">
        Créer votre compte
      </h2>
      <PassengerSignupForm />
    </div>
  );
}