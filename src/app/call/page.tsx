'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2 } from 'lucide-react';

interface CallSession {
  reference: string;
  caller: string;
  recipient: string;
  amount: string;
  transactionHash: string;
  transactionStatus: string;
}

export default function CallPage() {
  const router = useRouter();
  const [callSession, setCallSession] = useState<CallSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const verifyAndLoadCall = async () => {
      try {
        // Get JWT token from localStorage
        const token = localStorage.getItem('callToken');

        if (!token) {
          setError('No authentication token found. Please make a payment first.');
          setLoading(false);
          return;
        }

        // Call the JWT-gated endpoint
        const response = await fetch('/api/call', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to authenticate call session');
        }

        const data = await response.json();

        if (data.success && data.callSession) {
          setCallSession(data.callSession);
        } else {
          throw new Error('Invalid response from server');
        }
      } catch (err) {
        console.error('Error loading call:', err);
        setError(err instanceof Error ? err.message : 'Failed to load call session');
      } finally {
        setLoading(false);
      }
    };

    verifyAndLoadCall();
  }, []);

  const handleBackHome = () => {
    localStorage.removeItem('callToken');
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Verifying payment...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-sm">{error}</p>
            <Button onClick={handleBackHome} className="w-full">
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center flex items-center justify-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-green-500" />
            Call Authorized
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-lg font-semibold text-green-600">
              Payment Verified!
            </p>
            <p className="text-sm text-muted-foreground">
              Your payment has been confirmed and you are now authorized to join the call.
            </p>
          </div>

          {callSession && (
            <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
              <h3 className="font-medium text-sm">Call Session Details</h3>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Reference:</span>
                  <p className="font-mono break-all">{callSession.reference}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Caller:</span>
                  <p className="font-mono break-all">{callSession.caller}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Recipient:</span>
                  <p className="font-mono break-all">{callSession.recipient}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Amount:</span>
                  <p className="font-semibold">{callSession.amount} USDC</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Transaction Status:</span>
                  <p className="capitalize">{callSession.transactionStatus}</p>
                </div>
                {callSession.transactionHash && (
                  <div>
                    <span className="text-muted-foreground">Transaction Hash:</span>
                    <p className="font-mono break-all text-[10px]">{callSession.transactionHash}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="p-4 bg-primary/10 text-primary rounded-md text-center">
              <p className="font-medium">Call in Progress</p>
              <p className="text-sm mt-1">The backend will handle connecting you to the call</p>
            </div>
          </div>

          <Button onClick={handleBackHome} variant="outline" className="w-full">
            End Call & Return Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}