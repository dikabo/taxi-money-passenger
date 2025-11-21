'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, X, Camera } from 'lucide-react';

/**
 * File: /components/forms/QRScanner.tsx
 * Purpose: QR code scanner using html5-qrcode library
 * 
 * Features:
 * - Camera scanning with html5-qrcode
 * - Manual ID entry fallback
 * - Camera flip functionality
 * - Error handling
 * 
 * Installation: npm install html5-qrcode
 */

interface QRScannerProps {
  onScanSuccess: (driverId: string) => void;
}

export function QRScanner({ onScanSuccess }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [manualId, setManualId] = useState('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  
  const scannerRef = useRef<any>(null);
  const isMountedRef = useRef(true);

  // Define stopScanner using useCallback to stabilize reference
  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    setIsScanning(false);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopScanner();
    };
  }, [stopScanner]);

  const startScanner = async () => {
    setIsLoading(true);

    try {
      // Dynamically import html5-qrcode
      const { Html5Qrcode } = await import('html5-qrcode');
      
      // Stop any existing scanner
      if (scannerRef.current) {
        await scannerRef.current.stop();
      }

      // Create new scanner instance
      const html5QrCode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        { facingMode },
        config,
        (decodedText: string) => {
          console.log('QR Code detected:', decodedText);
          handleQRDetected(decodedText);
        },
        () => {
          // Silent - scanning errors are normal
        }
      );

      if (isMountedRef.current) {
        setIsScanning(true);
        setIsLoading(false);
        toast.success('Scanner activé', {
          description: 'Pointez la caméra vers le code QR',
        });
      }

    } catch (err: any) {
      console.error('Scanner error:', err);
      
      let errorMsg = 'Impossible de démarrer le scanner';
      
      if (err.name === 'NotAllowedError') {
        errorMsg = 'Permission caméra refusée. Autorisez l\'accès dans les paramètres.';
      } else if (err.name === 'NotFoundError') {
        errorMsg = 'Aucune caméra trouvée sur cet appareil.';
      } else if (err.name === 'NotReadableError') {
        errorMsg = 'Caméra déjà utilisée par une autre application.';
      }
      
      setIsLoading(false);
      
      toast.error('Erreur scanner', {
        description: errorMsg,
      });
    }
  };

  const handleQRDetected = async (code: string) => {
    await stopScanner();
    
    // Extract driver ID from QR code
    // Handle different QR formats:
    // - Plain ID: "TAXI1234"
    // - URL format: "taximoney://driver/TAXI1234"
    // - MongoDB ID: "507f1f77bcf86cd799439011"
    
    let driverId = code;
    
    if (code.includes('taximoney://driver/')) {
      driverId = code.split('taximoney://driver/')[1];
    } else if (code.includes('driver/')) {
      driverId = code.split('driver/')[1];
    }
    
    toast.success('QR Code détecté!', {
      description: `ID: ${driverId}`,
    });
    
    onScanSuccess(driverId);
  };

  const handleManualEntry = async () => {
    if (!manualId.trim()) {
      toast.error('ID requis', {
        description: 'Veuillez entrer l\'ID du chauffeur',
      });
      return;
    }

    await stopScanner();
    onScanSuccess(manualId.trim().toUpperCase());
    setManualId('');
  };

  const handleFlipCamera = async () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    if (isScanning) {
      await stopScanner();
      setTimeout(() => startScanner(), 100);
    }
  };

  return (
    <div className="space-y-4">
      {/* Scanner Container */}
      <Card className="bg-gray-900 border-gray-800 overflow-hidden">
        <CardContent className="p-4">
          {!isScanning ? (
            /* Start Scanner Button */
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="p-6 bg-gray-800 rounded-full">
                <Camera className="h-12 w-12 text-gray-400" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-white mb-2">
                  Scanner le code QR
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  Demandez au chauffeur de montrer son code QR
                </p>
              </div>
              <Button
                onClick={startScanner}
                disabled={isLoading}
                className="w-full max-w-xs"
                size="lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Démarrage...
                  </>
                ) : (
                  <>
                    <Camera className="mr-2 h-5 w-5" />
                    Activer la caméra
                  </>
                )}
              </Button>
            </div>
          ) : (
            /* Active Scanner */
            <div className="relative">
              {/* QR Reader Element */}
              <div id="qr-reader" className="rounded-lg overflow-hidden" />
              
              {/* Controls Overlay */}
              <div className="absolute top-2 right-2 flex gap-2">
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={handleFlipCamera}
                  className="rounded-full bg-gray-800 bg-opacity-80 hover:bg-opacity-100"
                >
                  <Camera className="h-5 w-5" />
                </Button>
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={stopScanner}
                  className="rounded-full"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              {/* Instructions */}
              <div className="mt-2 text-center">
                <p className="text-sm text-gray-400">
                  Placez le code QR dans le cadre
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-700"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-black text-gray-400">OU</span>
        </div>
      </div>

      {/* Manual Entry */}
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-4 space-y-3">
          <div>
            <label className="text-sm font-medium text-white mb-2 block">
              Entrer l&apos;ID manuellement
            </label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Ex: TAXI1234"
                value={manualId}
                onChange={(e) => setManualId(e.target.value.toUpperCase())}
                className="bg-gray-800 border-gray-700 text-white"
                disabled={isScanning}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleManualEntry();
                  }
                }}
              />
              <Button
                onClick={handleManualEntry}
                disabled={!manualId.trim() || isScanning}
                className="whitespace-nowrap"
              >
                Valider
              </Button>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-gray-800 rounded-lg p-3 text-xs text-gray-400">
            <p className="font-semibold mb-1">💡 Conseils:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Demandez son code QR ou ID au chauffeur</li>
              <li>Assurez-vous d&apos;avoir la permission caméra</li>
              <li>Utilisez l&apos;entrée manuelle si le scan échoue</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
