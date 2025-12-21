"use client";

import { useState, useEffect } from "react";
import { useAccount, useEnsName } from "wagmi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Plus, X, Loader2, Check, AlertCircle } from "lucide-react";
import { mainnet } from "wagmi/chains";
import { isWorldApp } from "@/lib/world-app";
import { useUpdateUser } from "@/hooks/useUsers";
import { MIN_CALL_PRICE } from "@/lib/config";
import { parsePhoneNumberFromString, isValidPhoneNumber, type CountryCode } from "libphonenumber-js";

// Allowed countries for phone numbers
const ALLOWED_COUNTRIES: CountryCode[] = [
  "US", // United States (+1)
  "AR", // Argentina (+54)
  "BR", // Brazil (+55)
  "AT", // Austria (+43)
  "BE", // Belgium (+32)
  "FR", // France (+33)
  "DE", // Germany (+49)
  "PT", // Portugal (+351)
  "CH", // Switzerland (+41)
  "GB", // United Kingdom (+44)
];

type RuleType = "poap" | "token" | "ens" | "humans";

interface PricingRule {
  id: string;
  type: RuleType;
  value: string;
  price: string;
}

interface YourPriceCardProps {
  forceEditMode?: boolean;
  onClose?: () => void;
}

export function YourPriceCard({ forceEditMode = false, onClose }: YourPriceCardProps = {}) {
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
  const [isEditing, setIsEditing] = useState(forceEditMode);

  useEffect(() => {
    if (forceEditMode) setIsEditing(true);
  }, [forceEditMode]);

  // Form Fields
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [originalHandle, setOriginalHandle] = useState(""); // Track existing handle
  const [handleStatus, setHandleStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [handleError, setHandleError] = useState("");
  const [bio, setBio] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [price, setPrice] = useState(MIN_CALL_PRICE.toString());
  const [onlyHumans, setOnlyHumans] = useState(false);
  const [saveError, setSaveError] = useState("");
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

  // Availability State
  const [availabilityEnabled, setAvailabilityEnabled] = useState(false);
  // Default to user's timezone or UTC
  const userTimezone = typeof Intl !== 'undefined'
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : 'UTC';
  const [timezone, setTimezone] = useState(userTimezone);
  const [timezoneSearch, setTimezoneSearch] = useState('');
  const [showTimezoneDropdown, setShowTimezoneDropdown] = useState(false);

  // Get all IANA timezones
  const allTimezones = typeof Intl !== 'undefined' && Intl.supportedValuesOf
    ? Intl.supportedValuesOf('timeZone')
    : ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo'];

  const filteredTimezones = allTimezones.filter(tz =>
    tz.toLowerCase().includes(timezoneSearch.toLowerCase())
  ).slice(0, 10); // Limit to 10 results for performance
  const [weekdaysStart, setWeekdaysStart] = useState("09:00");
  const [weekdaysEnd, setWeekdaysEnd] = useState("17:00");
  const [weekdaysEnabled, setWeekdaysEnabled] = useState(true);
  const [weekendsStart, setWeekendsStart] = useState("10:00");
  const [weekendsEnd, setWeekendsEnd] = useState("20:00");
  const [weekendsEnabled, setWeekendsEnabled] = useState(true);

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
            setName(data.user.name || "");
            setHandle(data.user.handle || "");
            setOriginalHandle(data.user.handle || ""); // Store original
            if (data.user.handle) setHandleStatus("available"); // Already has handle
            setBio(data.user.bio || "");
            setPhoneNumber(data.user.phoneNumber);
            setPrice(data.user.price);
            setOnlyHumans(data.user.onlyHumans || false);
            setPricingRules(data.user.rules || []);

            // Load Availability
            if (data.user.availability) {
              setAvailabilityEnabled(data.user.availability.enabled);
              setTimezone(data.user.availability.timezone);
              setWeekdaysStart(data.user.availability.weekdays.start);
              setWeekdaysEnd(data.user.availability.weekdays.end);
              setWeekdaysEnabled(data.user.availability.weekdays.enabled);
              setWeekendsStart(data.user.availability.weekends.start);
              setWeekendsEnd(data.user.availability.weekends.end);
              setWeekendsEnabled(data.user.availability.weekends.enabled);
            }

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

  // Handle check with debounce
  useEffect(() => {
    if (!handle || handle.length < 4) {
      setHandleStatus("idle");
      setHandleError("");
      return;
    }

    // If handle unchanged from original, it's still valid (user's own handle)
    if (handle.toLowerCase() === originalHandle.toLowerCase()) {
      setHandleStatus("available");
      setHandleError("");
      return;
    }

    // Basic validation
    const handleRegex = /^[a-zA-Z0-9_]{4,15}$/;
    if (!handleRegex.test(handle)) {
      setHandleStatus("invalid");
      setHandleError("Only letters, numbers, and underscores allowed (4-15 chars)");
      return;
    }

    setHandleStatus("checking");
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/user/handle/check?handle=${handle}`);
        const data = await res.json();
        if (data.available) {
          setHandleStatus("available");
          setHandleError("");
        } else {
          setHandleStatus("taken");
          setHandleError(data.error || "This handle is already taken");
        }
      } catch {
        setHandleStatus("invalid");
        setHandleError("Failed to check availability");
      }
    }, 500); // Debounce 500ms

    return () => clearTimeout(timeout);
  }, [handle]);

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
    val: string,
  ) =>
    setPricingRules(
      pricingRules.map((r) => (r.id === id ? { ...r, [field]: val } : r)),
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
    setSaveError("");

    if (!name || !phoneNumber || !price || !address) {
      setSaveError("Please fill in all required fields");
      return;
    }

    // Validate minimum price
    if (parseFloat(price) < MIN_CALL_PRICE) {
      setSaveError(`Minimum price is $${MIN_CALL_PRICE} USDC`);
      return;
    }

    // Normalize phone number to E.164 format for Twilio
    const parsed = parsePhoneNumberFromString(phoneNumber);
    const normalizedPhone = parsed?.format("E.164") || phoneNumber;

    try {
      await updateUser.mutateAsync({
        name,
        handle: handle || undefined, // Only send if set
        bio,
        address,
        phoneNumber: normalizedPhone,
        price,
        onlyHumans,
        rules: pricingRules,
        availability: {
          enabled: availabilityEnabled,
          timezone,
          weekdays: {
            start: weekdaysStart,
            end: weekdaysEnd,
            enabled: weekdaysEnabled,
          },
          weekends: {
            start: weekendsStart,
            end: weekendsEnd,
            enabled: weekendsEnabled,
          },
        },
      });

      setHasSetup(true);
      setIsEditing(false);
      if (onClose) onClose();
    } catch (e) {
      console.error(e);
      setSaveError("Failed to save settings. Please try again.");
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

    const parsed = parsePhoneNumberFromString(value);

    if (!parsed || !isValidPhoneNumber(value)) {
      setPhoneError("Invalid phone number");
      return;
    }

    if (!parsed.country || !ALLOWED_COUNTRIES.includes(parsed.country)) {
      setPhoneError("Country not supported. Supported: US, AR, BR, AT, BE, FR, DE, PT, CH, GB, IN, IL, JP, AU");
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
              <label className="text-sm font-medium">
                Handle <span className="text-muted-foreground text-xs">(your unique URL)</span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  @
                </div>
                <Input
                  type="text"
                  placeholder="yourhandle"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  className="w-full pl-8 pr-10"
                  maxLength={15}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {handleStatus === "checking" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  {handleStatus === "available" && <Check className="h-4 w-4 text-green-500" />}
                  {(handleStatus === "taken" || handleStatus === "invalid") && <AlertCircle className="h-4 w-4 text-red-500" />}
                </div>
              </div>
              {handleError && (
                <p className="text-xs text-red-500">{handleError}</p>
              )}
              {handleStatus === "available" && handle && (
                <p className="text-xs text-green-600">globalphone.me/u/{handle} is available!</p>
              )}
              {handle.length > 0 && handle.length < 4 && (
                <p className="text-xs text-muted-foreground">Handle must be at least 4 characters</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Bio / Headline</label>
              <Textarea
                placeholder="Short bio about yourself (e.g. Web3 Lawyer, Available for calls)"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full resize-none"
                maxLength={160}
              />
              <p className="text-xs text-muted-foreground text-right">{bio.length}/160</p>
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
              <label className="text-sm font-medium">Base Price (USDC) - Minimum ${MIN_CALL_PRICE}</label>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                min={MIN_CALL_PRICE}
                step="0.1"
                placeholder="e.g. 5"
                className={`${parseFloat(price) < MIN_CALL_PRICE ? 'border-red-500' : ''}`}
              />
            </div>

            {/* Availability Section */}
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Availability Schedule</label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="availability-enabled"
                    checked={availabilityEnabled}
                    onCheckedChange={(checked) => setAvailabilityEnabled(checked as boolean)}
                  />
                  <label htmlFor="availability-enabled" className="text-sm font-medium">
                    Enable
                  </label>
                </div>
              </div>

              {availabilityEnabled && (
                <div className="space-y-4 p-3 bg-slate-50 rounded-lg">
                  <div className="space-y-2 relative">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Timezone</label>
                    <div className="relative">
                      <Input
                        value={showTimezoneDropdown ? timezoneSearch : timezone}
                        onChange={(e) => {
                          setTimezoneSearch(e.target.value);
                          setShowTimezoneDropdown(true);
                        }}
                        onFocus={() => {
                          setTimezoneSearch('');
                          setShowTimezoneDropdown(true);
                        }}
                        onBlur={() => {
                          // Delay to allow click on dropdown item
                          setTimeout(() => setShowTimezoneDropdown(false), 150);
                        }}
                        placeholder="Search timezones..."
                        className="bg-white"
                      />
                      {showTimezoneDropdown && filteredTimezones.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                          {filteredTimezones.map((tz) => (
                            <button
                              key={tz}
                              type="button"
                              className={`w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors ${tz === timezone ? 'bg-primary/10 font-medium' : ''
                                }`}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setTimezone(tz);
                                setTimezoneSearch('');
                                setShowTimezoneDropdown(false);
                              }}
                            >
                              {tz.replace(/_/g, ' ')}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Current: {timezone.replace(/_/g, ' ')}</p>
                  </div>

                  {/* Weekdays */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold uppercase text-muted-foreground">Mon - Fri</label>
                      <Checkbox
                        checked={weekdaysEnabled}
                        onCheckedChange={(c) => setWeekdaysEnabled(c as boolean)}
                      />
                    </div>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="time"
                        value={weekdaysStart}
                        onChange={(e) => setWeekdaysStart(e.target.value)}
                        className="bg-white"
                        disabled={!weekdaysEnabled}
                      />
                      <span>-</span>
                      <Input
                        type="time"
                        value={weekdaysEnd}
                        onChange={(e) => setWeekdaysEnd(e.target.value)}
                        className="bg-white"
                        disabled={!weekdaysEnabled}
                      />
                    </div>
                  </div>

                  {/* Weekends */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold uppercase text-muted-foreground">Sat - Sun</label>
                      <Checkbox
                        checked={weekendsEnabled}
                        onCheckedChange={(c) => setWeekendsEnabled(c as boolean)}
                      />
                    </div>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="time"
                        value={weekendsStart}
                        onChange={(e) => setWeekendsStart(e.target.value)}
                        className="bg-white"
                        disabled={!weekendsEnabled}
                      />
                      <span>-</span>
                      <Input
                        type="time"
                        value={weekendsEnd}
                        onChange={(e) => setWeekendsEnd(e.target.value)}
                        className="bg-white"
                        disabled={!weekendsEnabled}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Rules Section - Coming Soon */}
            <div className="space-y-3 border-t pt-4 opacity-50">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  Custom Pricing Rules
                </label>
                <span className="text-xs bg-muted px-2 py-1 rounded-full">
                  Coming Soon
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Set different prices for POAP holders, token owners, ENS names, and more.
              </p>
              <Button
                variant="outline"
                size="sm"
                disabled
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" /> Add Rule
              </Button>
            </div>
          </div>

          {/* Error Message */}
          {saveError && (
            <div className="p-3 text-sm bg-destructive/10 text-destructive rounded-md flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {saveError}
            </div>
          )}

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
