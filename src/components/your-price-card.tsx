"use client";

import { useState, useEffect } from "react";
import { useAccount, useEnsName } from "wagmi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Plus, X, Loader2 } from "lucide-react";
import { mainnet } from "wagmi/chains";
import { isWorldApp } from "@/lib/world-app";
import { useUpdateUser } from "@/hooks/useUsers";
import { parsePhoneNumberFromString, isValidPhoneNumber } from "libphonenumber-js";

type RuleType = "poap" | "token" | "ens" | "humans";

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

  // React Query mutation
  const updateUser = useUpdateUser();

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [hasSetup, setHasSetup] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form Fields
  const [name, setName] = useState(""); // <--- NEW
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [price, setPrice] = useState("0.1");
  const [onlyHumans, setOnlyHumans] = useState(false);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);

  // MiniKit logic ...
  const [miniKitInstalled, setMiniKitInstalled] = useState<boolean | null>(
    null,
  );
  const [miniKitAddress, setMiniKitAddress] = useState<string | null>(null);

  useEffect(() => {
    const isInstalled = isWorldApp();
    setMiniKitInstalled(isInstalled);
    if (isInstalled) {
      setMiniKitAddress((window as any).MiniKit?.walletAddress || null);
    }
    const handleAddressChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ address: string }>;
      setMiniKitAddress(customEvent.detail.address);
    };
    window.addEventListener("minikit-address-changed", handleAddressChange);
    return () =>
      window.removeEventListener(
        "minikit-address-changed",
        handleAddressChange,
      );
  }, []);

  const isConnected = wagmiConnected || (miniKitInstalled && !!miniKitAddress);
  const address = miniKitAddress || wagmiAddress;

  // Check User Hook
  useEffect(() => {
    async function checkUser() {
      if (!address) return;
      setIsLoading(true);
      try {
        const res = await fetch(`/api/user?address=${address}`);
        if (res.ok) {
          const data = await res.json();
          if (data.found) {
            setName(data.user.name || ""); // Load Name
            setPhoneNumber(data.user.phoneNumber);
            setPrice(data.user.price);
            setOnlyHumans(data.user.onlyHumans || false);
            setPricingRules(data.user.rules || []);
            setHasSetup(true);
          }
        }
      } catch (e) {
        console.error("Error checking user", e);
      } finally {
        setIsLoading(false);
      }
    }
    if (isConnected && address) checkUser();
  }, [isConnected, address]);

  // Helpers
  const formatAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  const maskPhoneNumber = (phone: string) => {
    if (phone.length <= 6) return phone;
    return phone.slice(0, 4) + "*".repeat(phone.length - 6) + phone.slice(-2);
  };

  // Rules Logic
  const addPricingRule = () =>
    setPricingRules([
      ...pricingRules,
      {
        id: Math.random().toString(36).substring(7),
        type: "poap",
        value: "",
        price: "",
      },
    ]);
  const removePricingRule = (id: string) =>
    setPricingRules(pricingRules.filter((r) => r.id !== id));
  const updatePricingRule = (
    id: string,
    field: keyof PricingRule,
    value: string,
  ) =>
    setPricingRules(
      pricingRules.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );
  const getRuleTypeLabel = (type: RuleType) =>
    type === "poap"
      ? "POAP Owners"
      : type === "token"
        ? "Token Owners"
        : type === "ens"
          ? "ENS Names"
          : "Humans";

  // Save Handler
  const handleConfirmSetup = async () => {
    if (!name || !phoneNumber || !price || !address) return; // Check Name

    // Normalize phone number to E.164 format for Twilio
    const parsed = parsePhoneNumberFromString(phoneNumber);
    const normalizedPhone = parsed?.format("E.164") || phoneNumber;

    try {
      await updateUser.mutateAsync({
        name,
        address,
        phoneNumber: normalizedPhone,
        price,
        onlyHumans,
        rules: pricingRules,
      });

      setHasSetup(true);
      setIsEditing(false);
    } catch (e) {
      console.error(e);
      alert("Error saving settings.");
    }
  };

  const walletDisplay = ensName || (address ? formatAddress(address) : "");

  const maskedPhone = phoneNumber ? maskPhoneNumber(phoneNumber) : "";

  // Phone validation
  const validatePhoneNumber = (value: string) => {
    setPhoneNumber(value);

    if (!value) {
      setPhoneError(null);
      return;
    }

    if (!value.startsWith("+")) {
      setPhoneError("Include country code (e.g., +1 for US)");
      return;
    }

    if (!isValidPhoneNumber(value)) {
      setPhoneError("Invalid phone number");
      return;
    }

    setPhoneError(null);
  };

  const isPhoneValid = phoneNumber && !phoneError;

  // -- RENDER --

  if (!isConnected) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-center">Your price</CardTitle>
        </CardHeader>
        <CardContent className="text-center text-sm text-muted-foreground">
          Connect wallet to set your call price
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-8 flex justify-center">
          <Loader2 className="animate-spin h-8 w-8 text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  if (!hasSetup || isEditing) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-center">
            {isEditing ? "Edit Your Settings" : "Let people call you"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {/* NEW: Name Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Display Name</label>
              <Input
                type="text"
                placeholder="e.g. Alice, Dr. Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Phone Number</label>
              <Input
                type="tel"
                placeholder="+1 555 123 4567"
                value={phoneNumber}
                onChange={(e) => validatePhoneNumber(e.target.value)}
                className={`w-full ${phoneError ? "border-red-500" : ""}`}
              />
              {phoneError && (
                <p className="text-sm text-red-500">{phoneError}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Base Price (USDC)</label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  placeholder="5"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="flex-1"
                />
                <div className="flex items-center space-x-2 whitespace-nowrap">
                  <Checkbox
                    id={isEditing ? "only-humans-edit" : "only-humans"}
                    checked={onlyHumans}
                    onCheckedChange={(checked) =>
                      setOnlyHumans(checked as boolean)
                    }
                  />
                  <label
                    htmlFor={isEditing ? "only-humans-edit" : "only-humans"}
                    className="text-sm font-medium leading-none"
                  >
                    Only verified Humans
                  </label>
                </div>
              </div>
            </div>

            {/* Rules Section (Collapsed for brevity, same as before) */}
            <div className="space-y-3">
              <label className="text-sm font-medium">
                Custom Pricing Rules (Beta)
              </label>
              {pricingRules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex gap-2 items-end border p-2 rounded"
                >
                  <div className="flex-1 text-sm">
                    {getRuleTypeLabel(rule.type)}: {rule.value} - {rule.price}{" "}
                    USDC
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removePricingRule(rule.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={addPricingRule}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" /> Add Rule
              </Button>
            </div>
          </div>

          <Button
            onClick={handleConfirmSetup}
            className="w-full"
            disabled={!name || !isPhoneValid || !price || updateUser.isPending}
          >
            {updateUser.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
              </>
            ) : isEditing ? (
              "Save Changes"
            ) : (
              "Confirm"
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

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
          {onlyHumans && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
              Verified Humans Only
            </span>
          )}
          {pricingRules.length > 0 && (
            <div className="text-sm text-muted-foreground w-full max-w-md border-t pt-2 text-center">
              {pricingRules.length} Custom Rules Active
            </div>
          )}
        </div>
        <div className="text-center space-y-1">
          {/* SHOW NAME HERE */}
          <p className="text-lg font-semibold">{name}</p>
          <p className="text-sm text-muted-foreground flex flex-col lg:flex-row items-center justify-center gap-1 lg:gap-2">
            <span>{walletDisplay}</span>
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
