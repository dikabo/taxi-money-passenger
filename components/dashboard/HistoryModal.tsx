'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { History, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * File: /components/dashboard/HistoryModal.tsx
 * Purpose: Display passenger transaction history
 * FIXED: Now fetches real data from API
 */

interface Transaction {
  _id: string;
  type: 'Recharge' | 'Payment' | 'Withdrawal' | 'Charge';
  status: 'Pending' | 'Success' | 'Failed';
  amount: number;
  method: string;
  createdAt: string;
  notes?: string;
}

function formatUnits(amount: number) {
  return `${amount.toLocaleString('fr-CM')} Units`;
}

function formatTransactionType(type: string): string {
  const types: Record<string, string> = {
    'Recharge': 'Rechargement',
    'Payment': 'Paiement',
    'Withdrawal': 'Retrait',
    'Charge': 'Frais',
  };
  return types[type] || type;
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'Success': 'text-green-400',
    'Pending': 'text-yellow-400',
    'Failed': 'text-red-400',
  };
  return colors[status] || 'text-gray-400';
}

function getStatusText(status: string): string {
  const texts: Record<string, string> = {
    'Success': 'Réussi',
    'Pending': 'En attente',
    'Failed': 'Échoué',
  };
  return texts[status] || status;
}

export function HistoryModal({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchTransactions();
    }
  }, [open]);

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/transactions/history');
      
      if (!response.ok) {
        throw new Error('Échec du chargement de l\'historique');
      }

      const data = await response.json();
      setTransactions(data.transactions || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Erreur', {
        description: 'Impossible de charger l\'historique',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Historique des transactions</DialogTitle>
          <DialogDescription className="text-gray-400">
            Toutes vos transactions récentes
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-8 text-center text-gray-400">
            <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Aucune transaction trouvée</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <Card key={transaction._id} className="bg-gray-800 border-gray-700">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {formatTransactionType(transaction.type)}
                        </p>
                        <span className={`text-xs ${getStatusColor(transaction.status)}`}>
                          ({getStatusText(transaction.status)})
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-400 mt-1">
                        {new Date(transaction.createdAt).toLocaleString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>

                      <p className="text-xs text-gray-500 mt-1">
                        Méthode: {transaction.method}
                      </p>

                      {transaction.notes && (
                        <p className="text-xs text-gray-500 mt-1">
                          {transaction.notes}
                        </p>
                      )}
                    </div>

                    <div className={`text-lg font-bold ${
                      transaction.type === 'Recharge' 
                        ? 'text-green-400' 
                        : 'text-red-400'
                    }`}>
                      {transaction.type === 'Recharge' ? '+' : '-'}
                      {formatUnits(transaction.amount)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}