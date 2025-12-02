'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2 } from 'lucide-react';
import { toast as sonnerToast } from 'sonner';

/**
 * File: /components/dashboard/LogoutButton.tsx
 * Purpose: A client component to handle user logout.
 */
export function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    
    // We will create this API next
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
    });

    if (response.ok) {
      router.refresh(); // This will force a re-check of the session
      router.push('/login'); // Redirect to login page
    } else {
      sonnerToast.error('Échec de la déconnexion', {
        description: 'Veuillez réessayer.',
      });
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="destructive"
      className="w-full"
      onClick={handleLogout}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <LogOut className="mr-2 h-4 w-4" />
      )}
      Déconnexion
    </Button>
  );
}