"use client";

import { useState, useEffect } from "react";
import { useAccount, useEnsName } from "wagmi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Plus, X, Loader2 } from "lucide-react";
import { mainnet } from "wagmi/chains";
import { MiniKit } from "@worldcoin/minikit-js";

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

  // State
  const [isLoading, setIsLoading] = useState(false); // Loading profile
  const [isSaving, setIsSaving] = useState(false); // Saving profile
  const [hasSetup, setHasSetup] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [price, setPrice] = useState("0.1");
  const [onlyHumans, setOnlyHumans] = useState(false);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  // MiniKit State
  const [miniKitInstalled, setMiniKitInstalled] = useState<boolean | null>(
    null,
  );
  const [miniKitAddress, setMiniKitAddress] = useState<string | null>(null);

  // 1. MiniKit Initialization
  useEffect(() => {
    const isInstalled = MiniKit.isInstalled();
    setMiniKitInstalled(isInstalled);

    if (isInstalled) {
      const address =
        (window as unknown as { MiniKit?: { walletAddress?: string } }).MiniKit
          ?.walletAddress || null;
      setMiniKitAddress(address);
    }

    const handleAddressChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ address: string }>;
      setMiniKitAddress(customEvent.detail.address);
    };

    window.addEventListener("minikit-address-changed", handleAddressChange);
    return () => {
      window.removeEventListener(
        "minikit-address-changed",
        handleAddressChange,
      );
    };
  }, []);

  const isConnected = wagmiConnected || (miniKitInstalled && !!miniKitAddress);
  const address = miniKitAddress || wagmiAddress;

  // 2. BACKEND INTEGRATION: Check if user exists
  useEffect(() => {
    async function checkUser() {
      if (!address) return;

      setIsLoading(true);
      try {
        const res = await fetch(`/api/user?address=${address}`);
        if (res.ok) {
          const data = await res.json();
          if (data.found) {
            setPhoneNumber(data.user.phoneNumber);
            setPrice(data.user.price);
            // Restore optional fields if they exist
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

    if (isConnected && address) {
      checkUser();
    }
  }, [isConnected, address]);

  // 3. Helpers
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const maskPhoneNumber = (phone: string) => {
    if (phone.length <= 6) return phone;
    const firstFour = phone.slice(0, 4);
    const lastTwo = phone.slice(-2);
    const middleLength = phone.length - 6;
    return firstFour + "*".repeat(middleLength) + lastTwo;
  };

  // 4. Form Logic
  const addPricingRule = () => {
    const newRule: PricingRule = {
      id: Math.random().toString(36).substring(7),
      type: "poap",
      value: "",
      price: "",
    };
    setPricingRules([...pricingRules, newRule]);
  };

  const removePricingRule = (id: string) => {
    setPricingRules(pricingRules.filter((rule) => rule.id !== id));
  };

  const updatePricingRule = (
    id: string,
    field: keyof PricingRule,
    value: string,
  ) => {
    setPricingRules(
      pricingRules.map((rule) =>
        rule.id === id ? { ...rule, [field]: value } : rule,
      ),
    );
  };

  const getRuleTypeLabel = (type: RuleType) => {
    switch (type) {
      case "poap":
        return "POAP Owners";
      case "token":
        return "Token Owners";
      case "ens":
        return "ENS Names";
      case "humans":
        return "Humans";
    }
  };

  // 5. BACKEND INTEGRATION: Save Profile
  const handleConfirmSetup = async () => {
    if (!phoneNumber || !price || !address) return;

    setIsSaving(true);

    try {
      const response = await fetch("/api/user/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          phoneNumber,
          price,
          onlyHumans,
          rules: pricingRules,
        }),
      });

      if (response.ok) {
        setHasSetup(true);
        setIsEditing(false);
      } else {
        alert("Failed to save settings.");
      }
    } catch (e) {
      console.error(e);
      alert("Error saving settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const displayName = ensName || (address ? formatAddress(address) : "");
  const maskedPhone = phoneNumber ? maskPhoneNumber(phoneNumber) : "";

  // --- RENDERING ---

  // Not connected
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

  // Loading Profile from DB
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-8 flex justify-center">
          <Loader2 className="animate-spin h-8 w-8 text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  // Setup or Edit Mode
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
            {/* Phone Number */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone Number</label>
              <Input
                type="tel"
                placeholder="Enter your phone number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Price and Human Check */}
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
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Only verified Humans
                  </label>
                </div>
              </div>
            </div>

            {/* Custom Pricing Rules */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">
                  Custom Pricing Rules
                </label>
              </div>

              {pricingRules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex flex-col gap-2 lg:flex-row lg:items-end lg:gap-2 border p-3 rounded-lg lg:border-0 lg:p-0"
                >
                  <div className="lg:w-40">
                    <label className="block lg:hidden text-xs text-muted-foreground mb-1">
                      Type
                    </label>
                    <Select
                      value={rule.type}
                      onValueChange={(value) =>
                        updatePricingRule(rule.id, "type", value)
                      }
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
                      {rule.type === "humans"
                        ? "Optional: specific world ID"
                        : "Value"}
                    </label>
                    <Input
                      placeholder={
                        rule.type === "humans"
                          ? "Optional: specific world ID"
                          : rule.type === "ens"
                            ? "vitalik.eth"
                            : "0x..."
                      }
                      value={rule.value}
                      onChange={(e) =>
                        updatePricingRule(rule.id, "value", e.target.value)
                      }
                    />
                  </div>
                  <div className="lg:w-24">
                    <label className="block lg:hidden text-xs text-muted-foreground mb-1">
                      Price (USDC)
                    </label>
                    <Input
                      type="number"
                      placeholder="Price"
                      value={rule.price}
                      onChange={(e) =>
                        updatePricingRule(rule.id, "price", e.target.value)
                      }
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
            disabled={!phoneNumber || !price || isSaving}
          >
            {isSaving ? (
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

  // Display State (Read Only)
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

          {/* Only Humans Badge */}
          {onlyHumans && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
              Verified Humans Only
            </span>
          )}

          {/* Display Rules */}
          {pricingRules.length > 0 && (
            <div className="text-sm text-muted-foreground space-y-1 w-full max-w-md border-t pt-3">
              <p className="font-medium text-center mb-2 text-xs uppercase tracking-wider">
                Custom Pricing
              </p>
              {pricingRules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex justify-between items-center px-2 py-1 bg-gray-50 rounded"
                >
                  <span>
                    {getRuleTypeLabel(rule.type)}: {rule.value || "(Any)"}
                  </span>
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
