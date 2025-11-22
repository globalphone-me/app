'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MiniKit, PayCommandInput, Tokens, tokenToDecimals, VerifyCommandInput, VerificationLevel, ISuccessResult } from '@worldcoin/minikit-js';

export function CallCard() {
  const router = useRouter();
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('0.1'); // Default 0.1 USDC for testing
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState<'idle' | 'verifying' | 'paying'>('idle');

  const handleVerifyAndPay = async () => {
    if (!recipientAddress || !amount) {
      setError('Please enter a recipient address and amount');
      return;
    }

    if (!MiniKit.isInstalled()) {
      setError('MiniKit is not installed. Please open in World App.');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // STEP 1: Verify humanity with World ID
      setCurrentStep('verifying');

      const verifyPayload: VerifyCommandInput = {
        action: 'call-payment-gate', // Create this action in Developer Portal
        verification_level: VerificationLevel.Device,
      };

      const { finalPayload: verifyResult } = await MiniKit.commandsAsync.verify(verifyPayload);

      if (verifyResult.status === 'error') {
        throw new Error('Verification was cancelled or failed');
      }

      // Verify the proof in backend
      const verifyResponse = await fetch('/api/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payload: verifyResult as ISuccessResult,
          action: 'call-payment-gate',
        }),
      });

      const verifyResponseJson = await verifyResponse.json();

      if (!verifyResponse.ok || !verifyResponseJson.success) {
        throw new Error(verifyResponseJson.error || 'Human verification failed');
      }

      const nullifierHash = verifyResponseJson.nullifierHash;

      // STEP 2: Initiate payment (now that user is verified)
      setCurrentStep('paying');

      const initiateRes = await fetch('/api/initiate-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientAddress,
          amount,
          verifiedNullifier: nullifierHash,
        }),
      });

      if (!initiateRes.ok) {
        const errorData = await initiateRes.json();
        throw new Error(errorData.error || 'Failed to initiate payment');
      }

      const { id } = await initiateRes.json();

      // STEP 3: Create payment payload
      const payPayload: PayCommandInput = {
        reference: id,
        to: recipientAddress,
        tokens: [
          {
            symbol: Tokens.USDC,
            token_amount: tokenToDecimals(parseFloat(amount), Tokens.USDC).toString(),
          },
        ],
        description: `Verified human payment to call ${recipientAddress.slice(0, 6)}...${recipientAddress.slice(-4)}`,
      };

      // STEP 4: Send payment command via MiniKit
      const { finalPayload: payResult } = await MiniKit.commandsAsync.pay(payPayload);

      if (payResult.status === 'error') {
        throw new Error('Payment was cancelled or failed');
      }

      // STEP 5: Confirm payment in backend
      const confirmRes = await fetch('/api/confirm-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payload: payResult,
        }),
      });

      const confirmData = await confirmRes.json();

      if (!confirmData.success) {
        throw new Error(confirmData.error || 'Payment verification failed');
      }

      // STEP 6: Store JWT token and navigate to call page
      localStorage.setItem('callToken', confirmData.token);
      router.push('/call');
    } catch (err) {
      console.error('Verify & Pay error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setCurrentStep('idle');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-center">Call Someone</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="recipient" className="text-sm font-medium">
            Recipient Wallet Address
          </label>
          <Input
            id="recipient"
            type="text"
            placeholder="0x..."
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            className="w-full font-mono text-sm"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="amount" className="text-sm font-medium">
            Amount (USDC)
          </label>
          <Input
            id="amount"
            type="number"
            step="0.1"
            min="0.1"
            placeholder="5"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">Minimum: $0.10 USDC</p>
        </div>
        {error && (
          <div className="p-3 text-sm bg-destructive/10 text-destructive rounded-md">
            {error}
          </div>
        )}
        {currentStep !== 'idle' && (
          <div className="p-3 text-sm bg-primary/10 text-primary rounded-md">
            {currentStep === 'verifying' && '🔍 Step 1: Verifying humanity...'}
            {currentStep === 'paying' && '💰 Step 2: Processing payment...'}
          </div>
        )}
        <Button
          onClick={handleVerifyAndPay}
          className="w-full"
          disabled={isProcessing || !recipientAddress || !amount}
        >
          {isProcessing
            ? (currentStep === 'verifying' ? 'Verifying...' : 'Processing Payment...')
            : 'Verify & Pay to Call'}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          Two-step verification: World ID proof + USDC payment
        </p>
      </CardContent>
    </Card>
  );
}