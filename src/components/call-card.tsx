'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { MiniKit, PayCommandInput, Tokens, tokenToDecimals, VerifyCommandInput, VerificationLevel, ISuccessResult, Permission, RequestPermissionPayload } from '@worldcoin/minikit-js';
import { Device, Call } from "@twilio/voice-sdk";
import { useWalletClient, useAccount, useBalance } from 'wagmi';
import { wrapFetchWithPayment } from 'x402-fetch';
import { PAYMENT_RECIPIENT_ADDRESS, CHAIN } from '@/lib/config';
import { isWorldApp } from '@/lib/world-app';
import { monitor } from '@/lib/monitor';
import { Loader2, Wallet, AlertCircle, CheckCircle } from 'lucide-react';

// USDC on Base mainnet
const USDC_BASE_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const;

interface CallCardProps {
  prefilledAddress?: string;
  prefilledPrice?: string;
  disabled?: boolean;
  callButtonText?: string;
  calleeName?: string;
}

export function CallCard({ prefilledAddress, prefilledPrice, disabled, callButtonText, calleeName }: CallCardProps) {
  // Wagmi hooks for x402 payment
  const { isConnected: wagmiConnected, address: userAddress } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [recipientAddress, setRecipientAddress] = useState(prefilledAddress || '');
  const [amount, setAmount] = useState(prefilledPrice || '0.1');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState<'idle' | 'verifying' | 'paying' | 'calling'>('idle');
  const [_microphonePermissionGranted, setMicrophonePermissionGranted] = useState(false);

  // Pre-call modal state
  const [showPreCallModal, setShowPreCallModal] = useState(false);

  // USDC Balance on Base
  const { data: usdcBalance, isLoading: isBalanceLoading } = useBalance({
    address: userAddress,
    token: USDC_BASE_ADDRESS,
    chainId: CHAIN.id,
  });

  const requiredAmount = parseFloat(prefilledPrice || amount);
  const currentBalance = usdcBalance ? parseFloat(usdcBalance.formatted) : 0;
  const hasEnoughBalance = currentBalance >= requiredAmount;

  // Twilio State
  const [device, setDevice] = useState<Device | null>(null);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [deviceStatus, setDeviceStatus] = useState("Initializing...");

  // Call timer state
  const [callStartTime, setCallStartTime] = useState<number | null>(null);
  const [callDuration, setCallDuration] = useState(0);

  // Post-call state
  const [postCallState, setPostCallState] = useState<'none' | 'completed' | 'missed'>('none');
  const [finalCallDuration, setFinalCallDuration] = useState(0);

  // Track if call was answered (using ref to avoid stale closure in event handlers)
  const callWasAnsweredRef = useRef(false);
  const callStartTimeRef = useRef<number | null>(null);

  // Call duration timer effect
  useEffect(() => {
    if (!callStartTime) {
      setCallDuration(0);
      return;
    }

    const interval = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - callStartTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [callStartTime]);

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
        const startTime = Date.now();
        callWasAnsweredRef.current = true;
        callStartTimeRef.current = startTime;
        setCallStartTime(startTime);
        setCurrentStep('idle');
        setError('');
      });

      newCall.on('disconnect', () => {
        monitor.log("Call disconnected");
        // Determine if call was completed (answered) or missed using refs (not stale state)
        if (callWasAnsweredRef.current && callStartTimeRef.current) {
          // Call was answered - show thank you
          setFinalCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
          setPostCallState('completed');
        } else {
          // Call was never answered - show missed
          setPostCallState('missed');
        }
        // Reset refs
        callWasAnsweredRef.current = false;
        callStartTimeRef.current = null;
        setActiveCall(null);
        setCallStartTime(null);
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
              onClick={() => setShowPreCallModal(true)}
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

      {/* Pre-Call Payment Modal */}
      <Dialog
        open={showPreCallModal}
        onOpenChange={(open) => {
          // Prevent closing during processing or active call
          if (!open && (isProcessing || activeCall)) return;
          setShowPreCallModal(open);
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          onPointerDownOutside={(e) => {
            // Prevent close on click outside during processing/call
            if (isProcessing || activeCall) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            // Prevent close on Escape during processing/call
            if (isProcessing || activeCall) e.preventDefault();
          }}
        >
          {/* Post-Call View - Completed */}
          {postCallState === 'completed' ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-center text-2xl">🎉 Thank You!</DialogTitle>
                <DialogDescription className="text-center">
                  Thanks for using GlobalPhone
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-6 text-center">
                <div className="text-6xl">📞</div>
                <div>
                  <p className="text-lg font-medium">Your call lasted</p>
                  <p className="text-3xl font-mono font-bold text-primary mt-2">
                    {Math.floor(finalCallDuration / 60)} min {finalCallDuration % 60} sec
                  </p>
                </div>
                <Button
                  className="w-full"
                  onClick={() => {
                    setPostCallState('none');
                    setShowPreCallModal(false);
                  }}
                >
                  Done
                </Button>
              </div>
            </>
          ) : postCallState === 'missed' ? (
            /* Post-Call View - Missed */
            <>
              <DialogHeader>
                <DialogTitle className="text-center text-2xl">📵 Call Unavailable</DialogTitle>
                <DialogDescription className="text-center">
                  We couldn&apos;t connect your call
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-6 text-center">
                <div className="text-6xl">😔</div>
                <div>
                  <p className="text-lg">
                    Sorry, <strong>{calleeName || 'the callee'}</strong> is busy and couldn&apos;t pick up.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Try again later!
                  </p>
                </div>
                <Button
                  className="w-full"
                  onClick={() => {
                    setPostCallState('none');
                    setShowPreCallModal(false);
                  }}
                >
                  Close
                </Button>
              </div>
            </>
          ) : activeCall ? (
            /* In-Call View */
            <>
              <DialogHeader>
                <DialogTitle className="text-center">📞 Call in Progress</DialogTitle>
                <DialogDescription className="text-center">
                  Connected - call duration
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-6">
                {/* Timer Display */}
                <div className="text-center">
                  <div className="text-5xl font-mono font-bold text-primary">
                    {Math.floor(callDuration / 60).toString().padStart(2, '0')}:
                    {(callDuration % 60).toString().padStart(2, '0')}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">Call duration</p>
                </div>

                {/* Hang Up Button */}
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={handleHangup}
                >
                  🛑 Hang Up
                </Button>
              </div>
            </>
          ) : (
            /* Pre-Call View */
            <>
              <DialogHeader>
                <DialogTitle>Confirm Payment</DialogTitle>
                <DialogDescription>
                  Review your balance before starting the call
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Wallet Balance */}
                <div className="p-4 bg-muted rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-2">
                      <Wallet className="h-4 w-4" />
                      Your Balance (Base)
                    </span>
                    {isBalanceLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <span className="font-semibold">
                        ${currentBalance.toFixed(2)} USDC
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t pt-3">
                    <span className="text-sm text-muted-foreground">Call Price</span>
                    <span className="font-semibold">${requiredAmount.toFixed(2)} USDC</span>
                  </div>
                </div>

                {/* Balance Status */}
                {!isBalanceLoading && (
                  <div className={`p-3 rounded-lg flex items-center gap-2 ${hasEnoughBalance
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                    }`}>
                    {hasEnoughBalance ? (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm">You have enough balance to make this call</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm">
                          Insufficient balance. You need ${(requiredAmount - currentBalance).toFixed(2)} more USDC
                        </span>
                      </>
                    )}
                  </div>
                )}

                {/* Processing Status */}
                {isProcessing && (
                  <div className="p-3 text-sm bg-primary/10 text-primary rounded-md flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {currentStep === 'verifying' && 'Verifying humanity...'}
                    {currentStep === 'paying' && 'Processing payment...'}
                    {currentStep === 'calling' && 'Connecting call...'}
                  </div>
                )}

                {/* Error display */}
                {error && (
                  <div className="p-3 text-sm bg-destructive/10 text-destructive rounded-md">
                    {error}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowPreCallModal(false)}
                    disabled={isProcessing}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={!hasEnoughBalance || isBalanceLoading || isProcessing}
                    onClick={() => {
                      handleCall();
                    }}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      `Pay $${requiredAmount.toFixed(2)} & Call`
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}