'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, QrCode, User } from 'lucide-react'; // Importation de nouvelles icônes
import { cn } from '@/lib/utils/cn';

/**
 * Fichier: /components/layout/BottomNav.tsx
 * Objectif: La barre de navigation inférieure pour l'application PASSAGER.
 *
 * CORRECTION: Mise à jour vers 3 onglets (selon votre design).
 */
const navItems = [
  { href: '/home', label: 'Accueil', icon: Home },
  { href: '/pay', label: 'Payer', icon: QrCode },
  { href: '/profile', label: 'Profil', icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 z-50 w-full max-w-md mx-auto left-0 right-0 bg-black border-t border-gray-800">
      {/* CORRECTION: 'grid-cols-3' pour 3 onglets */}
      <div className="grid grid-cols-3 h-16">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center space-y-1',
                isActive ? 'text-white' : 'text-gray-500 hover:text-white'
              )}
            >
              <item.icon className="h-6 w-6" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}