'use client';

import { useState, ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

/**
 * Fichier: /components/dashboard/HistoryModal.tsx
 * Objectif: Un composant client qui gère le modal de l'historique.
 * 
 * UPDATED: Accepte maintenant un trigger personnalisé (children)
 */

interface HistoryModalProps {
  children: ReactNode; // ✅ Accept custom trigger button
}

export function HistoryModal({ children }: HistoryModalProps) {
  const [open, setOpen] = useState(false);

  // TODO: Remplacer par l'historique réel
  const transactions: unknown[] = [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-gray-900 border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle>Historique des transactions</DialogTitle>
          <DialogDescription>
            Voici vos paiements et recharges récents.
          </DialogDescription>
        </DialogHeader>

        {/* Contenu de l'historique */}
        <div className="mt-4 max-h-[60vh] overflow-y-auto">
          {transactions.length === 0 ? (
            <p className="text-gray-400 text-center py-4">
              Aucune transaction pour le moment.
            </p>
          ) : (
            <p>
              {/* TODO: Lister les transactions ici */}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}