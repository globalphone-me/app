'use client';

import { useState, useEffect } from 'react';
import { useAccount, useEnsName } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Pencil, Plus, X } from 'lucide-react';
import { mainnet } from 'wagmi/chains';
import { MiniKit, VerifyCommandInput, VerificationLevel, ISuccessResult } from '@worldcoin/minikit-js';

type RuleType = 'poap' | 'token' | 'ens' | 'humans';

interface PricingRule {
  id: string;
  type: RuleType;
  value: string;
  price: string;
}

export function YourPriceCard() {
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();
  const { data: ensName } = useEnsName({
    address: wagmiAddress,
    chainId: mainnet.id,
  });
  const [hasSetup, setHasSetup] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [displayedName, setDisplayedName] = useState('');
  const [price, setPrice] = useState('0.1');
  const [onlyHumans, setOnlyHumans] = useState(false);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [miniKitInstalled, setMiniKitInstalled] = useState<boolean | null>(null);
  const [miniKitAddress, setMiniKitAddress] = useState<string | null>(null);
  // const [isVerified, setIsVerified] = useState(false);
  // const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    const isInstalled = MiniKit.isInstalled();
    setMiniKitInstalled(isInstalled);

    if (isInstalled) {
      const address = (window as unknown as { MiniKit?: { walletAddress?: string } }).MiniKit?.walletAddress || null;
      setMiniKitAddress(address);
      console.log('[DEBUG] Initial MiniKit.walletAddress:', address);
    }

    console.log('[DEBUG] MiniKit.isInstalled():', isInstalled);
    console.log('[DEBUG] window.MiniKit:', (window as unknown as { MiniKit?: unknown }).MiniKit);

    // Listen for MiniKit address changes
    const handleAddressChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ address: string }>;
      console.log('[DEBUG] MiniKit address changed:', customEvent.detail.address);
      setMiniKitAddress(customEvent.detail.address);
    };

    window.addEventListener('minikit-address-changed', handleAddressChange);

    return () => {
      window.removeEventListener('minikit-address-changed', handleAddressChange);
    };
  }, []);

  // Unified connection status - check both wagmi and MiniKit
  const isConnected = wagmiConnected || (miniKitInstalled && !!miniKitAddress);
  const address = miniKitAddress || wagmiAddress;

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const maskPhoneNumber = (phone: string) => {
    if (phone.length <= 6) return phone;
    const firstFour = phone.slice(0, 4);
    const lastTwo = phone.slice(-2);
    const middleLength = phone.length - 6;
    return firstFour + '*'.repeat(middleLength) + lastTwo;
  };

  const addPricingRule = () => {
    const newRule: PricingRule = {
      id: Math.random().toString(36).substring(7),
      type: 'poap',
      value: '',
      price: '',
    };
    setPricingRules([...pricingRules, newRule]);
  };

  const removePricingRule = (id: string) => {
    setPricingRules(pricingRules.filter(rule => rule.id !== id));
  };

  const updatePricingRule = (id: string, field: keyof PricingRule, value: string) => {
    setPricingRules(pricingRules.map(rule =>
      rule.id === id ? { ...rule, [field]: value } : rule
    ));
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleVerifyHuman = async () => {
    if (!MiniKit.isInstalled()) {
      console.error('MiniKit is not installed');
      return;
    }

    // setIsVerifying(true);

    try {
      const verifyPayload: VerifyCommandInput = {
        action: 'verify-human', // This is your action ID from the Developer Portal
        verification_level: VerificationLevel.Device,
      };

      const { finalPayload } = await MiniKit.commandsAsync.verify(verifyPayload);

      if (finalPayload.status === 'error') {
        console.error('Verification error:', finalPayload);
        // setIsVerifying(false);
        return;
      }

      // Verify the proof in the backend
      const verifyResponse = await fetch('/api/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payload: finalPayload as ISuccessResult,
          action: 'verify-human',
        }),
      });

      const verifyResponseJson = await verifyResponse.json();

      if (verifyResponse.ok && verifyResponseJson.success) {
        // setIsVerified(true);
        console.log('Human verification successful!');
      } else {
        console.error('Verification failed:', verifyResponseJson);
      }
    } catch (error) {
      console.error('Verification error:', error);
    } finally {
      // setIsVerifying(false);
    }
  };

  const handleConfirmSetup = () => {
    if (phoneNumber && price) {
      setHasSetup(true);
    }
  };

  const getRuleTypeLabel = (type: RuleType) => {
    switch (type) {
      case 'poap': return 'POAP Owners';
      case 'token': return 'Token Owners';
      case 'ens': return 'ENS Names';
      case 'humans': return 'Humans';
    }
  };

  const displayName = displayedName || ensName || (address ? formatAddress(address) : '');
  const maskedPhone = phoneNumber ? maskPhoneNumber(phoneNumber) : '';

  // Not connected state
  if (!isConnected) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-center">Your price</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Connect your wallet to set your call price
          </p>
        </CardContent>
      </Card>
    );
  }

  // Initial setup state
  if (!hasSetup) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-center">Let people call you</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-medium">
                Phone Number
              </label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter your phone number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="displayedName" className="text-sm font-medium">
                Displayed Name
              </label>
              <Input
                id="displayedName"
                type="text"
                placeholder="Enter your displayed name"
                value={displayedName}
                onChange={(e) => setDisplayedName(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="price" className="text-sm font-medium">
                Base Price (USDC)
              </label>
              <div className="flex items-center gap-3">
                <Input
                  id="price"
                  type="number"
                  placeholder="5"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="flex-1"
                />
                <div className="flex items-center space-x-2 whitespace-nowrap">
                  <Checkbox
                    id="only-humans"
                    checked={onlyHumans}
                    onCheckedChange={(checked) => setOnlyHumans(checked as boolean)}
                  />
                  <label
                    htmlFor="only-humans"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Only verified Humans
                  </label>
                </div>
              </div>
            </div>

            {/* Custom Pricing Rules */}
            <div className="space-y-3">
              {pricingRules.map((rule) => (
                <div key={rule.id} className="flex flex-col gap-2 lg:flex-row lg:items-end lg:gap-2 border p-3 rounded-lg lg:border-0 lg:p-0">
                  <div className="lg:w-40">
                    <label className="block lg:hidden text-xs text-muted-foreground mb-1">Type</label>
                    <Select
                      value={rule.type}
                      onValueChange={(value) => updatePricingRule(rule.id, 'type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="poap">POAP Owners</SelectItem>
                        <SelectItem value="token">Token Owners</SelectItem>
                        <SelectItem value="ens">ENS Names</SelectItem>
                        <SelectItem value="humans">Humans</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="lg:flex-1">
                    <label className="block lg:hidden text-xs text-muted-foreground mb-1">
                      {rule.type === 'humans' ? 'Optional: specific world ID' : 'Value'}
                    </label>
                    <Input
                      placeholder={
                        rule.type === 'humans'
                          ? 'Optional: specific world ID'
                          : rule.type === 'ens'
                            ? 'vitalik.eth'
                            : '0x...'
                      }
                      value={rule.value}
                      onChange={(e) => updatePricingRule(rule.id, 'value', e.target.value)}
                    />
                  </div>
                  <div className="lg:w-24">
                    <label className="block lg:hidden text-xs text-muted-foreground mb-1">Price (USDC)</label>
                    <Input
                      type="number"
                      placeholder="Price"
                      value={rule.price}
                      onChange={(e) => updatePricingRule(rule.id, 'price', e.target.value)}
                    />
                  </div>
                  <div className="lg:w-10">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removePricingRule(rule.id)}
                      className="w-full lg:w-auto"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              <Button
                variant="outline"
                size="sm"
                onClick={addPricingRule}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add custom pricing rule
              </Button>
            </div>
          </div>
          <Button
            onClick={handleConfirmSetup}
            className="w-full"
            disabled={!phoneNumber || !price}
          >
            Confirm
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Setup complete - editing state
  if (isEditing) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-center">Edit Your Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="phone-edit" className="text-sm font-medium">
                Phone Number
              </label>
              <Input
                id="phone-edit"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="displayedName-edit" className="text-sm font-medium">
                Displayed Name
              </label>
              <Input
                id="displayedName-edit"
                type="text"
                value={displayedName}
                onChange={(e) => setDisplayedName(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="price-edit" className="text-sm font-medium">
                Base Price (USDC)
              </label>
              <div className="flex items-center gap-3">
                <Input
                  id="price-edit"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="flex-1"
                />
                <div className="flex items-center space-x-2 whitespace-nowrap">
                  <Checkbox
                    id="only-humans-edit"
                    checked={onlyHumans}
                    onCheckedChange={(checked) => setOnlyHumans(checked as boolean)}
                  />
                  <label
                    htmlFor="only-humans-edit"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    only humans
                  </label>
                </div>
              </div>
            </div>

            {/* Custom Pricing Rules - Edit Mode */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Custom Pricing Rules</label>
              {pricingRules.map((rule) => (
                <div key={rule.id} className="flex flex-col gap-2 lg:flex-row lg:items-end lg:gap-2 border p-3 rounded-lg lg:border-0 lg:p-0">
                  <div className="lg:w-40">
                    <label className="block lg:hidden text-xs text-muted-foreground mb-1">Type</label>
                    <Select
                      value={rule.type}
                      onValueChange={(value) => updatePricingRule(rule.id, 'type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="poap">POAP Owners</SelectItem>
                        <SelectItem value="token">Token Owners</SelectItem>
                        <SelectItem value="ens">ENS Names</SelectItem>
                        <SelectItem value="humans">Humans</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="lg:flex-1">
                    <label className="block lg:hidden text-xs text-muted-foreground mb-1">
                      {rule.type === 'humans' ? 'Optional: specific world ID' : 'Value'}
                    </label>
                    <Input
                      placeholder={
                        rule.type === 'humans'
                          ? 'Optional: specific world ID'
                          : rule.type === 'ens'
                            ? 'vitalik.eth'
                            : '0x...'
                      }
                      value={rule.value}
                      onChange={(e) => updatePricingRule(rule.id, 'value', e.target.value)}
                    />
                  </div>
                  <div className="lg:w-24">
                    <label className="block lg:hidden text-xs text-muted-foreground mb-1">Price (USDC)</label>
                    <Input
                      type="number"
                      placeholder="Price"
                      value={rule.price}
                      onChange={(e) => updatePricingRule(rule.id, 'price', e.target.value)}
                    />
                  </div>
                  <div className="lg:w-10">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removePricingRule(rule.id)}
                      className="w-full lg:w-auto"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              <Button
                variant="outline"
                size="sm"
                onClick={addPricingRule}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add custom pricing rule
              </Button>
            </div>
          </div>
          <Button
            onClick={() => setIsEditing(false)}
            className="w-full"
          >
            Save Changes
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Setup complete - display state
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-center">Your price</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-4xl font-bold">{price} USDC</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
          {pricingRules.length > 0 && (
            <div className="text-sm text-muted-foreground space-y-1 w-full max-w-md">
              <p className="font-medium text-center mb-2">Custom Pricing:</p>
              {pricingRules.map((rule) => (
                <div key={rule.id} className="flex justify-between items-center px-2">
                  <span>{getRuleTypeLabel(rule.type)}: {rule.value}</span>
                  <span className="font-semibold">{rule.price} USDC</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm text-muted-foreground flex flex-col lg:flex-row items-center justify-center gap-1 lg:gap-2">
            <span>{displayName}</span>
            {maskedPhone && (
              <>
                <span className="hidden lg:inline">•</span>
                <span>{maskedPhone}</span>
              </>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
