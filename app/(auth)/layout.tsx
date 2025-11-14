import React from 'react';

/**
 * Fichier: /app/(auth)/layout.tsx
 * Objectif: Layout simple pour les pages d'authentification.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Layout centré simple pour les formulaires
  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}