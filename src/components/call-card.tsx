'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MiniKit, PayCommandInput, Tokens, tokenToDecimals, VerifyCommandInput, VerificationLevel, ISuccessResult, Permission, RequestPermissionPayload } from '@worldcoin/minikit-js';
import { Device, Call } from "@twilio/voice-sdk";
import { useWalletClient, useAccount } from 'wagmi';
import { wrapFetchWithPayment } from 'x402-fetch';
import { PAYMENT_RECIPIENT_ADDRESS } from '@/lib/config';
import { isWorldApp } from '@/lib/world-app';
import { monitor } from '@/lib/monitor';

interface CallCardProps {
  prefilledAddress?: string;
  prefilledPrice?: string;
  disabled?: boolean;
  callButtonText?: string;
}

export function CallCard({ prefilledAddress, prefilledPrice, disabled, callButtonText }: CallCardProps) {
  // Wagmi hooks for x402 payment
  const { isConnected: wagmiConnected, address: userAddress } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [recipientAddress, setRecipientAddress] = useState(prefilledAddress || '');
  const [amount, setAmount] = useState(prefilledPrice || '0.1'); // Default 0.1 USDC for testing
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState<'idle' | 'verifying' | 'paying' | 'calling'>('idle');
  const [microphonePermissionGranted, setMicrophonePermissionGranted] = useState(false);

  // Twilio State
  const [device, setDevice] = useState<Device | null>(null);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [deviceStatus, setDeviceStatus] = useState("Initializing...");

  // Initialize Twilio Device on Mount
  useEffect(() => {
    let deviceInstance: Device | null = null;

    async function initTwilio() {
      try {
        const resp = await fetch("/api/token");
        const data = await resp.json();

        const newDevice = new Device(data.token);
        deviceInstance = newDevice;

        newDevice.on("ready", () => setDeviceStatus("Ready"));
        newDevice.on("error", (err) => {
          monitor.error(err, { context: "Twilio Device Error" });
          setDeviceStatus("Error");
        });

        newDevice.register();
        setDevice(newDevice);
        setDeviceStatus("Ready");
      } catch (e) {
        console.error("Failed to init Twilio", e);
        setDeviceStatus("Failed");
      }
    }
    initTwilio();

    return () => {
      // Properly cleanup Twilio Device on unmount to prevent WebSocket close errors
      if (deviceInstance) {
        deviceInstance.unregister();
        deviceInstance.destroy();
      }
    };
  }, []);

  // Detect environment - prioritize MiniKit if available
  const isMiniKitEnv = isWorldApp();
  // Only use wallet if MiniKit is NOT available
  const isWalletEnv = !isMiniKitEnv && wagmiConnected && !!walletClient;

  const handleX402Payment = async () => {
    if (!recipientAddress) {
      setError('Please enter a recipient address');
      return;
    }

    if (!isWalletEnv) {
      setError('Wallet not connected. Please connect your wallet.');
      return;
    }

    setIsProcessing(true);
    setError('');
    setCurrentStep('paying');

    monitor.log("Starting x402 payment flow", { recipient: recipientAddress });

    try {
      // Wrap fetch with x402 payment handling
      // @ts-expect-error - x402-fetch types might expect a strict Viem client, but Wagmi's is compatible
      const secureFetch = wrapFetchWithPayment(fetch, walletClient, BigInt(10000 * 10 ** 6));

      // Request connection - this will trigger 402 payment flow
      const response = await secureFetch('/api/purchase-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetAddress: recipientAddress, callerAddress: userAddress }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Payment failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data.token || !data.phoneId) {
        throw new Error('Invalid response from payment server');
      }

      monitor.log("x402 Payment successful", { phoneId: data.phoneId });

      // STEP 2: Connect Twilio call with payment credentials
      setCurrentStep('calling');

      if (!device || deviceStatus !== 'Ready') {
        throw new Error('Phone service not ready. Please refresh and try again.');
      }

      const { phoneId, token } = data;

      const newCall = await device.connect({
        params: {
          phoneId: phoneId,
          token: token,
        },
      });

      // Handle Call Events
      newCall.on('accept', () => {
        monitor.log("Call accepted");
        setCurrentStep('idle');
        setError('');
      });

      newCall.on('disconnect', () => {
        monitor.log("Call disconnected");
        setActiveCall(null);
        setCurrentStep('idle');
      });

      setActiveCall(newCall);
      setIsProcessing(false);
    } catch (err) {
      monitor.error(err, { context: "x402 Flow Error" });
      setError(err instanceof Error ? err.message : 'An error occurred');
      setCurrentStep('idle');
      setIsProcessing(false);
    }
  };

  const handleVerifyAndPay = async () => {
    if (!recipientAddress || !amount) {
      setError('Please enter a recipient address and amount');
      return;
    }

    if (!isMiniKitEnv) {
      setError('MiniKit is not installed. Please open in World App.');
      return;
    }

    setIsProcessing(true);
    setError('');

    monitor.log("Starting MiniKit verification flow", { recipient: recipientAddress, amount });

    try {
      // STEP 0: Request microphone permission before anything else
      try {
        // Check current permissions
        const { finalPayload: permissionsResult } = await MiniKit.commandsAsync.getPermissions();

        if (permissionsResult.status === 'success') {
          const hasMicrophonePermission = permissionsResult.permissions[Permission.Microphone] === true;

          if (!hasMicrophonePermission) {
            const requestPermissionPayload: RequestPermissionPayload = {
              permission: Permission.Microphone,
            };

            const { finalPayload: permissionResult } = await MiniKit.commandsAsync.requestPermission(requestPermissionPayload);

            if (permissionResult.status === 'error') {
              const errorCode = permissionResult.error_code as string;
              if (errorCode === 'world_app_permission_not_enabled') {
                throw new Error('Please enable microphone for World App in your device settings first');
              } else if (errorCode === 'user_rejected') {
                throw new Error('Microphone permission denied');
              } else if (errorCode === 'permission_disabled') {
                throw new Error('Microphone permission is disabled for World App');
              } else {
                throw new Error(`Permission error: ${errorCode}`);
              }
            }

            setMicrophonePermissionGranted(true);
          } else {
            setMicrophonePermissionGranted(true);
          }
        }
      } catch (permError) {
        throw permError;
      }

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
      monitor.log("Human verification successful", { nullifierHash });

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
      monitor.log("Payment initiated", { paymentId: id });

      // STEP 3: Create payment payload
      const payPayload: PayCommandInput = {
        reference: id,
        to: PAYMENT_RECIPIENT_ADDRESS, // Send to escrow
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

      // STEP 6: Connect Twilio call with payment credentials
      setCurrentStep('calling');

      if (!device || deviceStatus !== "Ready") {
        throw new Error("Phone service not ready. Please refresh and try again.");
      }

      const { phoneId, token } = confirmData;

      const newCall = await device.connect({
        params: {
          phoneId: phoneId,
          token: token,
        },
      });

      // Handle Call Events
      newCall.on("accept", () => {
        monitor.log("Call accepted (MiniKit)");
        setCurrentStep('idle');
        setError('');
      });

      newCall.on("disconnect", () => {
        monitor.log("Call disconnected (MiniKit)");
        setActiveCall(null);
        setCurrentStep('idle');
      });

      setActiveCall(newCall);
      setIsProcessing(false);
    } catch (err) {
      monitor.error(err, { context: "MiniKit Flow Error" });
      setError(err instanceof Error ? err.message : 'An error occurred');
      setCurrentStep('idle');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCall = async () => {
    // Route to appropriate payment flow based on environment
    if (isMiniKitEnv) {
      await handleVerifyAndPay();
    } else if (isWalletEnv) {
      await handleX402Payment();
    } else {
      setError('Please connect your wallet or open in World App');
    }
  };

  const handleHangup = () => {
    if (activeCall) {
      activeCall.disconnect();
      setActiveCall(null);
      setCurrentStep('idle');
    }
  };

  // Determine payment method for UI display
  const paymentMethod = isMiniKitEnv ? 'World App' : isWalletEnv ? 'x402' : 'Not Connected';
  const isConnected = isMiniKitEnv || isWalletEnv;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-center">Make a Call</CardTitle>
        <div className="flex justify-between items-center text-xs mt-2">
          <span className="text-muted-foreground">
            {activeCall ? '📞 On call...' : `Payment: ${paymentMethod}`}
          </span>
          <span
            className={`px-2 py-1 rounded ${deviceStatus === "Ready" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
          >
            System: {deviceStatus}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeCall ? (
          <div className="bg-red-50 p-4 rounded text-center">
            <p className="mb-2 font-bold text-red-700">On a call with {recipientAddress.slice(0, 6)}...{recipientAddress.slice(-4)}</p>
            <button
              onClick={handleHangup}
              className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 transition"
            >
              🛑 Hang Up
            </button>
          </div>
        ) : (
          <>
            {/* How it works explanation */}
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium text-sm">How it works</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <span className="text-base">💳</span>
                  <span>Pay <strong className="text-foreground">${prefilledPrice || amount} USDC</strong> to start the call</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-base">📞</span>
                  <span>If they pick up, the call connects and they keep the payment</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-base">💰</span>
                  <span>If they don&apos;t pick up, you get a <strong className="text-foreground">refund</strong> (minus a $0.10 fee for cellular connection)</span>
                </div>
              </div>
            </div>
            {isMiniKitEnv && (
              <div className="space-y-2">
                <label htmlFor="amount" className="text-sm font-medium">
                  Amount (USDC)
                </label>
                {prefilledPrice ? (
                  <div className="p-2 border rounded-md bg-muted text-sm">
                    {prefilledPrice} USDC
                  </div>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            )}
            {error && (
              <div className="p-3 text-sm bg-destructive/10 text-destructive rounded-md">
                {error}
              </div>
            )}
            {currentStep !== 'idle' && (
              <div className="p-3 text-sm bg-primary/10 text-primary rounded-md">
                {currentStep === 'verifying' && '🔍 Step 1: Verifying humanity...'}
                {currentStep === 'paying' && `💰 ${isMiniKitEnv ? 'Step 2: Processing payment...' : 'Processing payment...'}`}
                {currentStep === 'calling' && `📞 ${isMiniKitEnv ? 'Step 3: Connecting call...' : 'Connecting call...'}`}
              </div>
            )}
            <Button
              onClick={handleCall}
              className="w-full"
              disabled={isProcessing || !recipientAddress || (isMiniKitEnv && !amount) || deviceStatus !== "Ready" || !isConnected || disabled}
            >
              {isProcessing
                ? (currentStep === 'verifying' ? 'Verifying...' : currentStep === 'paying' ? 'Processing Payment...' : 'Connecting...')
                : callButtonText || (isMiniKitEnv ? 'Verify & Pay to Call' : 'Pay to Call')}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              {isMiniKitEnv
                ? 'World ID proof + USDC payment + Call'
                : isWalletEnv
                  ? 'x402 payment + Call'
                  : 'Connect wallet or open in World App to call'}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}