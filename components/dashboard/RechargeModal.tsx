'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { RechargeForm } from '@/components/forms/RechargeForm';

/**
 * Fichier: /components/dashboard/RechargeModal.tsx
 * Objectif: Un composant client qui gère le modal de recharge.
 */
export function RechargeModal() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="w-full bg-gray-800 hover:bg-gray-700">
          Recharger
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-gray-900 border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle>Recharger votre portefeuille</DialogTitle>
          <DialogDescription>
            Via Fapshi. Entrez le montant et la méthode.
          </DialogDescription>
        </DialogHeader>
        <RechargeForm setOpen={setOpen} />
      </DialogContent>
    </Dialog>
  );
}