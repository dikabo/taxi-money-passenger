'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast as sonnerToast } from 'sonner';
import { Loader2, X, Copy } from 'lucide-react';

/**
 * File: /components/forms/QRScanner.tsx
 * Purpose: QR code scanner using device camera
 * 
 * IMPLEMENTATION APPROACH:
 * 1. User clicks "Start Camera"
 * 2. Camera permission requested
 * 3. Video feed displayed
 * 4. Manual ID entry as fallback
 * 5. Returns driver ID for payment
 */

interface QRScannerProps {
  onScanSuccess: (driverId: string) => void;
}

export function QRScanner({ onScanSuccess }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [manualId, setManualId] = useState('');
  const streamRef = useRef<MediaStream | null>(null);

  // Start camera scanning
  const startCamera = useCallback(async () => {
    setIsLoading(true);
    try {
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsScanning(true);

        sonnerToast.success('Caméra activée', {
          description: 'Pointez votre caméra vers le code QR du chauffeur',
        });
      }
    } catch (error: unknown) {
      console.error('Camera error:', error);

      const err = error as Error & { name?: string };
      if (err.name === 'NotAllowedError') {
        sonnerToast.error('Permission refusée', {
          description: 'Veuillez autoriser l\'accès à la caméra',
        });
      } else if (err.name === 'NotFoundError') {
        sonnerToast.error('Caméra non trouvée', {
          description: 'Aucune caméra disponible',
        });
      } else {
        sonnerToast.error('Erreur caméra', {
          description: 'Impossible d\'accéder à la caméra',
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  }, []);

  // Handle manual ID submission
  const handleManualId = () => {
    if (!manualId.trim()) {
      sonnerToast.error('ID requis', {
        description: 'Entrez l\'ID du chauffeur',
      });
      return;
    }

    stopCamera();
    onScanSuccess(manualId.toUpperCase());
    setManualId('');
  };

  // Simulate QR detection (since real QR decoding requires library)
  const simulateQRDetection = useCallback(() => {
    // This is a placeholder - in production, use jsQR or zxing-js
    // For now, show instruction to enter manually
    if (isScanning) {
      const detectionMsg = 'Pour scanner, veuillez utiliser un appareil avec lecteur QR. Ou entrez l\'ID manuellement.';
      console.log(detectionMsg);
    }
  }, [isScanning]);

  return (
    <div className="space-y-4">
      {/* Camera Feed */}
      {isScanning && (
        <Card className="bg-gray-900 border-gray-800 overflow-hidden">
          <CardContent className="p-0 relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-64 object-cover bg-black"
            />
            <div className="absolute inset-0 border-2 border-yellow-400 opacity-50 m-8" />
            
            {/* Close button */}
            <button
              onClick={stopCamera}
              className="absolute top-2 right-2 p-2 bg-red-600 rounded-full hover:bg-red-700"
            >
              <X className="h-5 w-5 text-white" />
            </button>

            {/* Instructions */}
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-3 text-white text-sm text-center">
              Alignez le code QR avec le cadre jaune
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual ID Entry */}
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-white mb-2 block">
            Ou entrez l&apos;ID du chauffeur
          </label>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Ex: TAXI1234"
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
              disabled={isScanning}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleManualId();
                }
              }}
            />
            <Button
              onClick={handleManualId}
              disabled={!manualId.trim() || isScanning}
              className="whitespace-nowrap"
            >
              Entrer
            </Button>
          </div>
        </div>

        {/* Camera Controls */}
        {!isScanning ? (
          <Button
            onClick={startCamera}
            disabled={isLoading}
            className="w-full"
            variant="outline"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Activation caméra...
              </>
            ) : (
              'Démarrer le scanner QR'
            )}
          </Button>
        ) : (
          <Button
            onClick={stopCamera}
            className="w-full"
            variant="destructive"
          >
            Arrêter le scanner
          </Button>
        )}
      </div>

      {/* Info */}
      <div className="bg-gray-800 rounded-lg p-3 text-sm text-gray-300">
        <p className="font-semibold mb-1">💡 Conseil:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Demandez au chauffeur de partager son code QR</li>
          <li>Ou entrez son ID directement</li>
          <li>Assurez-vous d&apos;avoir donné permission à la caméra</li>
        </ul>
      </div>
    </div>
  );
}